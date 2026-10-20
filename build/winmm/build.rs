fn main() {
    // 导出转发依赖 DEF 导出表；不同链接器的传参方式不同。
    // - GNU (x86_64-pc-windows-gnu): ld 通过 --export-all-symbols 导出 global_asm! 定义的跳板
    // - MSVC: link.exe 需要 /DEF:<path> 才会应用 winmm.def
    let env = std::env::var("CARGO_CFG_TARGET_ENV").unwrap_or_default();
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap_or_else(|_| ".".to_string());

    if env == "msvc" {
        let def = format!("{}/winmm.def", manifest_dir.replace('\\', "/"));
        println!("cargo:rustc-link-arg=/DEF:{}", def);
        println!("cargo:rerun-if-changed=winmm.def");
    } else {
        println!("cargo:rustc-link-arg=-Wl,--export-all-symbols");
        println!("cargo:rerun-if-changed=winmm.def");
    }
}
