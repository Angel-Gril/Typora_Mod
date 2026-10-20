#![allow(non_snake_case)]
#[no_mangle]
pub static mut SLOT: usize = 0;
#[unsafe(naked)]
#[no_mangle]
pub unsafe extern "C" fn timeBeginPeriod() -> usize {
    core::arch::naked_asm!("jmp qword ptr [rip + SLOT]");
}
