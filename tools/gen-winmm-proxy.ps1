# Generate Rust source for a transparent winmm proxy (naked jmp trampolines)
param(
  [string]$Def = 'C:\AI\RD\Tool\mcp\typora-license-audit\build\winmm\winmm.def',
  [string]$Out = 'C:\AI\RD\Tool\mcp\typora-license-audit\build\winmm\src\lib.rs'
)
$ErrorActionPreference = 'Stop'
$names = @()
foreach ($line in Get-Content $Def) {
  if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_@?$]*)\s*=') { $names += $Matches[1] }
}
Write-Host ("exports: " + $names.Count)

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('#![allow(non_snake_case, static_mut_refs)]')
[void]$sb.AppendLine('use core::arch::global_asm;')
[void]$sb.AppendLine('use std::ffi::c_void;')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('type HANDLE = *mut c_void;')
[void]$sb.AppendLine('type BOOL = i32;')
[void]$sb.AppendLine('type DWORD = u32;')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('#[link(name = "kernel32")]')
[void]$sb.AppendLine('extern "system" {')
[void]$sb.AppendLine('    fn CreateFileW(lp: *const u16, acc: DWORD, share: DWORD, sa: *mut c_void, disp: DWORD, flags: DWORD, tmpl: HANDLE) -> HANDLE;')
[void]$sb.AppendLine('    fn WriteFile(h: HANDLE, buf: *const u8, n: DWORD, written: *mut DWORD, ov: *mut c_void) -> BOOL;')
[void]$sb.AppendLine('    fn CloseHandle(h: HANDLE) -> BOOL;')
[void]$sb.AppendLine('    fn GetSystemTimeAsFileTime(lp: *mut u64);')
[void]$sb.AppendLine('    fn GetModuleHandleW(name: *const u16) -> HANDLE;')
[void]$sb.AppendLine('    fn GetCurrentProcessId() -> DWORD;')
[void]$sb.AppendLine('    fn GetProcAddress(h: HANDLE, name: *const u8) -> *mut c_void;')
[void]$sb.AppendLine('    fn LoadLibraryW(name: *const u16) -> HANDLE;')
[void]$sb.AppendLine('}')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('#[no_mangle]')
[void]$sb.AppendLine('pub extern "system" fn typora_stub_zero() -> usize { 0 }')
[void]$sb.AppendLine('')

# slot statics
for ($i = 0; $i -lt $names.Count; $i++) {
  $n = $names[$i]
  [void]$sb.AppendLine("#[no_mangle]")
  [void]$sb.AppendLine("pub static mut SLOT_$i" + ": usize = 0;")
}
[void]$sb.AppendLine('')

# global asm trampolines
[void]$sb.AppendLine('global_asm!(')
[void]$sb.AppendLine('r#"')
for ($i = 0; $i -lt $names.Count; $i++) {
  $n = $names[$i]
  [void]$sb.AppendLine(".globl $n")
  [void]$sb.AppendLine("$n" + ":")
  [void]$sb.AppendLine("    jmp qword ptr [rip + SLOT_$i]")
}
[void]$sb.AppendLine('"#')
[void]$sb.AppendLine(');')
[void]$sb.AppendLine('')

# wide + log helpers
[void]$sb.AppendLine('fn wide(s: &str) -> Vec<u16> { s.encode_utf16().chain(std::iter::once(0)).collect() }')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('fn log_line(tag: &str) {')
[void]$sb.AppendLine('    unsafe {')
[void]$sb.AppendLine('        let path = wide(r"C:\AI\RD\Tool\mcp\typora-license-audit\exports\winmm.log");')
[void]$sb.AppendLine('        let h = CreateFileW(path.as_ptr(), 0x40000000, 3, std::ptr::null_mut(), 4, 0x80, std::ptr::null_mut());')
[void]$sb.AppendLine('        if h as isize == -1 { return; }')
[void]$sb.AppendLine('        extern "system" { fn SetFilePointer(h: HANDLE, lo: i32, hi: *mut i32, method: DWORD) -> DWORD; }')
[void]$sb.AppendLine('        SetFilePointer(h, 0, std::ptr::null_mut(), 2);')
[void]$sb.AppendLine('        let mut ft: u64 = 0; GetSystemTimeAsFileTime(&mut ft);')
[void]$sb.AppendLine('        let line = format!("[{}] pid={} ft={}\n", tag, GetCurrentProcessId(), ft);')
[void]$sb.AppendLine('        let mut w: DWORD = 0;')
[void]$sb.AppendLine('        WriteFile(h, line.as_ptr(), line.len() as DWORD, &mut w, std::ptr::null_mut());')
[void]$sb.AppendLine('        CloseHandle(h);')
[void]$sb.AppendLine('    }')
[void]$sb.AppendLine('}')
[void]$sb.AppendLine('')

# resolve routine
[void]$sb.AppendLine('#[no_mangle]')
[void]$sb.AppendLine('pub extern "system" fn typora_resolve(base: HANDLE) -> usize {')
[void]$sb.AppendLine('    let stub = typora_stub_zero as usize;')
[void]$sb.AppendLine('    let mut resolved = 0usize;')
[void]$sb.AppendLine('    unsafe {')
$i = 0
foreach ($n in $names) {
  [void]$sb.AppendLine("    { let p = GetProcAddress(base, b`"$n\x00`".as_ptr()); SLOT_$i = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }")
  $i++
}
[void]$sb.AppendLine('    }')
[void]$sb.AppendLine('    resolved')
[void]$sb.AppendLine('}')
[void]$sb.AppendLine('')

# DllMain
[void]$sb.AppendLine('#[no_mangle]')
[void]$sb.AppendLine('pub extern "system" fn DllMain(_h: HANDLE, reason: DWORD, _r: *mut c_void) -> BOOL {')
[void]$sb.AppendLine('    match reason {')
[void]$sb.AppendLine('        1 => {')
[void]$sb.AppendLine('            unsafe {')
[void]$sb.AppendLine('                let stub = typora_stub_zero as usize;')
for ($i = 0; $i -lt $names.Count; $i++) { [void]$sb.AppendLine("                SLOT_$i = stub;") }
[void]$sb.AppendLine('                let name = wide("winmm_real.dll");')
[void]$sb.AppendLine('                let mut base = LoadLibraryW(name.as_ptr());')
[void]$sb.AppendLine('                if base.is_null() { base = GetModuleHandleW(wide("winmm.dll").as_ptr()); }')
[void]$sb.AppendLine('                let n = if base.is_null() { 0 } else { typora_resolve(base) };')
[void]$sb.AppendLine('                install_native();')
[void]$sb.AppendLine('                log_line(&format!("DLL_PROCESS_ATTACH resolved={}/' + $names.Count + '", n));')
[void]$sb.AppendLine('            }')
[void]$sb.AppendLine('        }')
[void]$sb.AppendLine('        0 => log_line("DLL_PROCESS_DETACH"),')
[void]$sb.AppendLine('        _ => {}')
[void]$sb.AppendLine('    }')
[void]$sb.AppendLine('    1')
[void]$sb.AppendLine('}')
[void]$sb.AppendLine('include!("hook.rs");')

[System.IO.File]::WriteAllText($Out, $sb.ToString(), (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("generated: " + $Out + " (" + (Get-Item $Out).Length + " bytes)")
