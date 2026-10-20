// winmm proxy — native hooks (included from generated lib.rs)
// L2: asar side-by-side redirect + automatic rebuild (update-resistant)

use std::sync::atomic::{AtomicUsize, Ordering};

// HANDLE / BOOL / DWORD / wide() / log_line() / GetModuleHandleW / GetProcAddress
// are provided by the generated lib.rs (textual include).

#[link(name = "kernel32")]
extern "system" {
    fn GetModuleFileNameW(h: HANDLE, buf: *mut u16, n: DWORD) -> DWORD;
    fn VirtualProtect(addr: *mut c_void, size: usize, newp: DWORD, oldp: *mut DWORD) -> BOOL;
}

static ORIG_CREATEFILEW: AtomicUsize = AtomicUsize::new(0);
static APP_ASAR_LOWER: AtomicUsize = AtomicUsize::new(0); // *mut String (leaked)
static APP_VIRT_LOWER: AtomicUsize = AtomicUsize::new(0);

const LOADER_REL: &str = "C:/AI/RD/Tool/mcp/typora-license-audit/patches/virt-loader.js";

/// Read `virt.cfg` ({"loader":"C:/.../virt-loader.js"}) next to winmm.dll.
/// Falls back to the compiled-in default path.
fn loader_path(app_dir: &str) -> String {
    let cfg = format!("{}\\virt.cfg", app_dir);
    if let Ok(s) = std::fs::read_to_string(&cfg) {
        if let Some(i) = s.find("\"loader\"") {
            let rest = &s[i + 8..];
            if let Some(q1) = rest.find('"') {
                let rest2 = &rest[q1 + 1..];
                if let Some(q2) = rest2.find('"') {
                    let p = rest2[..q2].replace("\\\\", "/");
                    if !p.is_empty() { return p; }
                }
            }
        }
    }
    LOADER_REL.to_string()
}

fn self_dir() -> String {
    unsafe {
        let mut buf = vec![0u16; 1024];
        let n = GetModuleFileNameW(std::ptr::null_mut(), buf.as_mut_ptr(), 1024) as usize;
        let s = String::from_utf16_lossy(&buf[..n]);
        match s.rfind('\\') {
            Some(i) => s[..i].to_string(),
            None => String::new(),
        }
    }
}

// ---------------------------------------------------------------- asar tools

fn align4(n: usize) -> usize { (n + 3) & !3 }

/// Parse an asar file into (json: Value, data: Vec<u8>, data_start: usize)
fn parse_asar(bytes: &[u8]) -> Option<(serde_json::Value, usize)> {
    if bytes.len() < 16 { return None; }
    let header_size = u32::from_le_bytes([bytes[4], bytes[5], bytes[6], bytes[7]]) as usize;
    let json_len = u32::from_le_bytes([bytes[12], bytes[13], bytes[14], bytes[15]]) as usize;
    if 16 + json_len > bytes.len() { return None; }
    let json = serde_json::from_slice::<serde_json::Value>(&bytes[16..16 + json_len]).ok()?;
    let data_start = 8 + header_size;
    if data_start > bytes.len() { return None; }
    Some((json, data_start))
}

struct Entry {
    path: Vec<String>,
    offset: usize,
    size: usize,
}

fn collect_entries(v: &serde_json::Value, prefix: &mut Vec<String>, out: &mut Vec<Entry>) {
    if let Some(files) = v.get("files").and_then(|f| f.as_object()) {
        for (name, node) in files {
            prefix.push(name.clone());
            if let (Some(off), Some(sz)) = (
                node.get("offset").and_then(|o| o.as_str()).and_then(|s| s.parse::<usize>().ok()),
                node.get("size").and_then(|s| s.as_u64()),
            ) {
                out.push(Entry { path: prefix.clone(), offset: off, size: sz as usize });
            } else {
                collect_entries(node, prefix, out);
            }
            prefix.pop();
        }
    }
}

fn set_entry(v: &mut serde_json::Value, path: &[String], offset: usize, size: usize, modified: bool) {
    let mut cur = v;
    for (i, seg) in path.iter().enumerate() {
        let next = match cur.get_mut("files").and_then(|f| f.get_mut(seg)) {
            Some(n) => n,
            None => return,
        };
        cur = next;
        if i + 1 == path.len() {
            cur["offset"] = serde_json::json!(offset.to_string());
            cur["size"] = serde_json::json!(size);
            if modified {
                // integrity 会因改写而失效; 保留字段但置空, 避免 Electron 误用
                if cur.get("integrity").is_some() {
                    cur["integrity"] = serde_json::Value::Null;
                }
            }
        }
    }
}

/// Build a patched asar: inject loader require into launch.dist.js, rebuild offsets.
fn build_patched_asar(src: &[u8]) -> Option<Vec<u8>> {
    let (mut json, data_start) = parse_asar(src)?;

    let mut entries: Vec<Entry> = Vec::new();
    let mut prefix: Vec<String> = Vec::new();
    collect_entries(&json, &mut prefix, &mut entries);
    if entries.is_empty() { return None; }
    entries.sort_by_key(|e| e.offset);

    // gather data slices, patch launch.dist.js
    let mut blobs: Vec<Vec<u8>> = Vec::new();
    let mut modified_flags: Vec<bool> = Vec::new();
    let mut found_entry = false;
    for e in &entries {
        let start = data_start + e.offset;
        let end = start + e.size;
        if end > src.len() { return None; }
        let mut blob = src[start..end].to_vec();
        let mut modified = false;
        let leaf = e.path.last().map(|s| s.as_str()).unwrap_or("");
        if leaf == "launch.dist.js" {
            found_entry = true;
            let inject = format!("\"use strict\";require('{}');", loader_path(&self_dir()));
            // 仅在未注入时添加
            let has = String::from_utf8_lossy(&blob).contains("virt-loader.js");
            if !has {
                let mut nb = Vec::with_capacity(blob.len() + inject.len());
                nb.extend_from_slice(inject.as_bytes());
                nb.extend_from_slice(&blob);
                blob = nb;
                modified = true;
            }
        }
        blobs.push(blob);
        modified_flags.push(modified);
    }

    // 旧版布局(<=1.9.x): main.node + atom.js, 无 JS 注入点 -> 不生成旁路 asar
    if !found_entry {
        log_line("HOOK unsupported layout: launch.dist.js not found (Typora <= 1.9.x)");
        return None;
    }

    // recompute offsets
    let mut off = 0usize;
    for (i, e) in entries.iter().enumerate() {
        set_entry(&mut json, &e.path, off, blobs[i].len(), modified_flags[i]);
        off += blobs[i].len();
    }

    let json_bytes = serde_json::to_vec(&json).ok()?;
    let payload = align4(4 + json_bytes.len());           // 4(len field) + json + pad
    let header_size = 4 + payload;                        // u32@4 的值
    let data_start_new = 8 + header_size;

    let mut out = Vec::with_capacity(data_start_new + off);
    out.extend_from_slice(&4u32.to_le_bytes());
    out.extend_from_slice(&(header_size as u32).to_le_bytes());
    out.extend_from_slice(&(payload as u32).to_le_bytes());
    out.extend_from_slice(&(json_bytes.len() as u32).to_le_bytes());
    out.extend_from_slice(&json_bytes);
    while out.len() < data_start_new { out.push(0); }
    for b in &blobs { out.extend_from_slice(b); }
    Some(out)
}

/// Ensure resources/app.virt.asar is up to date with resources/app.asar.
/// Returns true if a redirect should be installed.
fn ensure_virt(app_dir: &str) -> bool {
    let res = format!("{}\\resources", app_dir);
    let asar = format!("{}\\app.asar", res);
    let virt = format!("{}\\app.virt.asar", res);
    let meta = format!("{}\\app.virt.meta", res);

    let src = match std::fs::read(&asar) { Ok(v) => v, Err(_) => { log_line("HOOK no app.asar"); return false; } };

    // fingerprint = size + first 32 bytes hex
    let head: String = src.iter().take(32).map(|b| format!("{:02x}", b)).collect();
    let want = format!("{{\"size\":{},\"head\":\"{}\"}}", src.len(), head);

    let mut need_build = true;
    if let Ok(cur) = std::fs::read_to_string(&meta) {
        if cur.contains(&format!("\"size\":{}", src.len())) && cur.contains(&head) {
            if std::fs::metadata(&virt).map(|m| m.len() > 0).unwrap_or(false) {
                need_build = false;
            }
        }
    }

    if need_build {
        log_line("HOOK rebuilding app.virt.asar for current app.asar");
        match build_patched_asar(&src) {
            Some(out) => {
                if std::fs::write(&virt, &out).is_err() { log_line("HOOK write virt failed"); return false; }
                let _ = std::fs::write(&meta, want.as_bytes());
                log_line(&format!("HOOK rebuilt virt={} bytes (src={})", out.len(), src.len()));
            }
            None => { log_line("HOOK rebuild failed (unexpected asar layout)"); return false; }
        }
    }

    let asar_low = "\\resources\\app.asar".to_string();
    let virt_low = "\\resources\\app.virt.asar".to_string();
    APP_ASAR_LOWER.store(Box::into_raw(Box::new(asar_low)) as usize, Ordering::Relaxed);
    APP_VIRT_LOWER.store(Box::into_raw(Box::new(virt_low)) as usize, Ordering::Relaxed);
    true
}

unsafe fn install_iat_hook() -> usize {
    let base = GetModuleHandleW(std::ptr::null()) as usize;
    if base == 0 { return 0; }
    let e_lfanew = *((base + 0x3C) as *const u32) as usize;
    let opt = (base + e_lfanew + 24) as *const u8;
    if *(opt as *const u16) != 0x20B { return 0; }
    let import_dir_rva = *((opt as usize + 112 + 8) as *const u32) as usize;
    if import_dir_rva == 0 { return 0; }

    let mut desc: usize = base + import_dir_rva;
    let mut patched = 0usize;
    loop {
        let oft = *(desc as *const u32) as usize;
        let name_rva = *((desc + 12) as *const u32) as usize;
        let ft = *((desc + 16) as *const u32) as usize;
        if oft == 0 && ft == 0 && name_rva == 0 { break; }
        let dll = std::ffi::CStr::from_ptr((base + name_rva) as *const i8).to_string_lossy().to_string();
        let mut t = base + if oft != 0 { oft } else { ft };
        let mut iat = base + ft;
        loop {
            let thunk = *(t as *const u64);
            if thunk == 0 { break; }
            if thunk & 0x8000_0000_0000_0000 == 0 {
                let name = std::ffi::CStr::from_ptr((base + (thunk as u32 as usize) + 2) as *const i8)
                    .to_string_lossy().to_string();
                if name == "CreateFileW" {
                    let mut old = 0u32;
                    VirtualProtect(iat as *mut c_void, 8, 0x04, &mut old);
                    *(iat as *mut u64) = hook_createfilew as usize as u64;
                    VirtualProtect(iat as *mut c_void, 8, old, &mut old);
                    patched += 1;
                    log_line(&format!("HOOK IAT patched CreateFileW ({})", dll));
                }
            }
            t += 8;
            iat += 8;
        }
        desc += 20;
    }
    patched
}

unsafe extern "system" fn hook_createfilew(
    lp_file_name: *const u16,
    dw_desired_access: DWORD,
    dw_share_mode: DWORD,
    lp_security_attributes: *mut c_void,
    dw_creation_disposition: DWORD,
    dw_flags_and_attributes: DWORD,
    h_template_file: HANDLE,
) -> HANDLE {
    let orig = ORIG_CREATEFILEW.load(Ordering::Relaxed);
    let mut name_ptr = lp_file_name;
    let mut newbuf: Vec<u16> = Vec::new();

    if !lp_file_name.is_null() {
        let mut n = 0usize;
        while *lp_file_name.add(n) != 0 && n < 4096 { n += 1; }
        let s = String::from_utf16_lossy(std::slice::from_raw_parts(lp_file_name, n));
        let low = s.to_lowercase();
        let asar = APP_ASAR_LOWER.load(Ordering::Relaxed) as *const String;
        let virt = APP_VIRT_LOWER.load(Ordering::Relaxed) as *const String;
        if !asar.is_null() && !virt.is_null() {
            let a = &*asar;
            let v = &*virt;
            if low.ends_with(a.as_str()) {
                let prefix_len = s.len() - a.len();
                let mut replaced = String::with_capacity(s.len());
                replaced.push_str(&s[..prefix_len]);
                replaced.push_str(v);
                newbuf = replaced.encode_utf16().chain(std::iter::once(0)).collect();
                name_ptr = newbuf.as_ptr();
            }
        }
    }

    let f: unsafe extern "system" fn(*const u16, DWORD, DWORD, *mut c_void, DWORD, DWORD, HANDLE) -> HANDLE =
        std::mem::transmute(orig);
    f(name_ptr, dw_desired_access, dw_share_mode, lp_security_attributes, dw_creation_disposition, dw_flags_and_attributes, h_template_file)
}

pub fn install_native() {
    unsafe {
        let k32 = GetModuleHandleW(wide("kernel32.dll").as_ptr());
        if k32.is_null() { log_line("HOOK no kernel32"); return; }
        let p = GetProcAddress(k32, b"CreateFileW\x00".as_ptr());
        if p.is_null() { log_line("HOOK no CreateFileW"); return; }
        ORIG_CREATEFILEW.store(p as usize, Ordering::Relaxed);

        let app = self_dir();
        // 只在应用目录(含 resources\app.asar)才安装, 避免影响其他进程
        if !std::path::Path::new(&format!("{}\\resources\\app.asar", app)).exists() {
            return;
        }
        if !ensure_virt(&app) { log_line("HOOK ensure_virt failed"); return; }
        let n = install_iat_hook();
        log_line(&format!("HOOK installed iat_entries={}", n));
    }
}
