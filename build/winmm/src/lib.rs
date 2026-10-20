#![allow(non_snake_case, static_mut_refs)]
use core::arch::global_asm;
use std::ffi::c_void;

type HANDLE = *mut c_void;
type BOOL = i32;
type DWORD = u32;

#[link(name = "kernel32")]
extern "system" {
    fn CreateFileW(lp: *const u16, acc: DWORD, share: DWORD, sa: *mut c_void, disp: DWORD, flags: DWORD, tmpl: HANDLE) -> HANDLE;
    fn WriteFile(h: HANDLE, buf: *const u8, n: DWORD, written: *mut DWORD, ov: *mut c_void) -> BOOL;
    fn CloseHandle(h: HANDLE) -> BOOL;
    fn GetSystemTimeAsFileTime(lp: *mut u64);
    fn GetModuleHandleW(name: *const u16) -> HANDLE;
    fn GetCurrentProcessId() -> DWORD;
    fn GetProcAddress(h: HANDLE, name: *const u8) -> *mut c_void;
    fn LoadLibraryW(name: *const u16) -> HANDLE;
}

#[no_mangle]
pub extern "system" fn typora_stub_zero() -> usize { 0 }

#[no_mangle]
pub static mut SLOT_0: usize = 0;
#[no_mangle]
pub static mut SLOT_1: usize = 0;
#[no_mangle]
pub static mut SLOT_2: usize = 0;
#[no_mangle]
pub static mut SLOT_3: usize = 0;
#[no_mangle]
pub static mut SLOT_4: usize = 0;
#[no_mangle]
pub static mut SLOT_5: usize = 0;
#[no_mangle]
pub static mut SLOT_6: usize = 0;
#[no_mangle]
pub static mut SLOT_7: usize = 0;
#[no_mangle]
pub static mut SLOT_8: usize = 0;
#[no_mangle]
pub static mut SLOT_9: usize = 0;
#[no_mangle]
pub static mut SLOT_10: usize = 0;
#[no_mangle]
pub static mut SLOT_11: usize = 0;
#[no_mangle]
pub static mut SLOT_12: usize = 0;
#[no_mangle]
pub static mut SLOT_13: usize = 0;
#[no_mangle]
pub static mut SLOT_14: usize = 0;
#[no_mangle]
pub static mut SLOT_15: usize = 0;
#[no_mangle]
pub static mut SLOT_16: usize = 0;
#[no_mangle]
pub static mut SLOT_17: usize = 0;
#[no_mangle]
pub static mut SLOT_18: usize = 0;
#[no_mangle]
pub static mut SLOT_19: usize = 0;
#[no_mangle]
pub static mut SLOT_20: usize = 0;
#[no_mangle]
pub static mut SLOT_21: usize = 0;
#[no_mangle]
pub static mut SLOT_22: usize = 0;
#[no_mangle]
pub static mut SLOT_23: usize = 0;
#[no_mangle]
pub static mut SLOT_24: usize = 0;
#[no_mangle]
pub static mut SLOT_25: usize = 0;
#[no_mangle]
pub static mut SLOT_26: usize = 0;
#[no_mangle]
pub static mut SLOT_27: usize = 0;
#[no_mangle]
pub static mut SLOT_28: usize = 0;
#[no_mangle]
pub static mut SLOT_29: usize = 0;
#[no_mangle]
pub static mut SLOT_30: usize = 0;
#[no_mangle]
pub static mut SLOT_31: usize = 0;
#[no_mangle]
pub static mut SLOT_32: usize = 0;
#[no_mangle]
pub static mut SLOT_33: usize = 0;
#[no_mangle]
pub static mut SLOT_34: usize = 0;
#[no_mangle]
pub static mut SLOT_35: usize = 0;
#[no_mangle]
pub static mut SLOT_36: usize = 0;
#[no_mangle]
pub static mut SLOT_37: usize = 0;
#[no_mangle]
pub static mut SLOT_38: usize = 0;
#[no_mangle]
pub static mut SLOT_39: usize = 0;
#[no_mangle]
pub static mut SLOT_40: usize = 0;
#[no_mangle]
pub static mut SLOT_41: usize = 0;
#[no_mangle]
pub static mut SLOT_42: usize = 0;
#[no_mangle]
pub static mut SLOT_43: usize = 0;
#[no_mangle]
pub static mut SLOT_44: usize = 0;
#[no_mangle]
pub static mut SLOT_45: usize = 0;
#[no_mangle]
pub static mut SLOT_46: usize = 0;
#[no_mangle]
pub static mut SLOT_47: usize = 0;
#[no_mangle]
pub static mut SLOT_48: usize = 0;
#[no_mangle]
pub static mut SLOT_49: usize = 0;
#[no_mangle]
pub static mut SLOT_50: usize = 0;
#[no_mangle]
pub static mut SLOT_51: usize = 0;
#[no_mangle]
pub static mut SLOT_52: usize = 0;
#[no_mangle]
pub static mut SLOT_53: usize = 0;
#[no_mangle]
pub static mut SLOT_54: usize = 0;
#[no_mangle]
pub static mut SLOT_55: usize = 0;
#[no_mangle]
pub static mut SLOT_56: usize = 0;
#[no_mangle]
pub static mut SLOT_57: usize = 0;
#[no_mangle]
pub static mut SLOT_58: usize = 0;
#[no_mangle]
pub static mut SLOT_59: usize = 0;
#[no_mangle]
pub static mut SLOT_60: usize = 0;
#[no_mangle]
pub static mut SLOT_61: usize = 0;
#[no_mangle]
pub static mut SLOT_62: usize = 0;
#[no_mangle]
pub static mut SLOT_63: usize = 0;
#[no_mangle]
pub static mut SLOT_64: usize = 0;
#[no_mangle]
pub static mut SLOT_65: usize = 0;
#[no_mangle]
pub static mut SLOT_66: usize = 0;
#[no_mangle]
pub static mut SLOT_67: usize = 0;
#[no_mangle]
pub static mut SLOT_68: usize = 0;
#[no_mangle]
pub static mut SLOT_69: usize = 0;
#[no_mangle]
pub static mut SLOT_70: usize = 0;
#[no_mangle]
pub static mut SLOT_71: usize = 0;
#[no_mangle]
pub static mut SLOT_72: usize = 0;
#[no_mangle]
pub static mut SLOT_73: usize = 0;
#[no_mangle]
pub static mut SLOT_74: usize = 0;
#[no_mangle]
pub static mut SLOT_75: usize = 0;
#[no_mangle]
pub static mut SLOT_76: usize = 0;
#[no_mangle]
pub static mut SLOT_77: usize = 0;
#[no_mangle]
pub static mut SLOT_78: usize = 0;
#[no_mangle]
pub static mut SLOT_79: usize = 0;
#[no_mangle]
pub static mut SLOT_80: usize = 0;
#[no_mangle]
pub static mut SLOT_81: usize = 0;
#[no_mangle]
pub static mut SLOT_82: usize = 0;
#[no_mangle]
pub static mut SLOT_83: usize = 0;
#[no_mangle]
pub static mut SLOT_84: usize = 0;
#[no_mangle]
pub static mut SLOT_85: usize = 0;
#[no_mangle]
pub static mut SLOT_86: usize = 0;
#[no_mangle]
pub static mut SLOT_87: usize = 0;
#[no_mangle]
pub static mut SLOT_88: usize = 0;
#[no_mangle]
pub static mut SLOT_89: usize = 0;
#[no_mangle]
pub static mut SLOT_90: usize = 0;
#[no_mangle]
pub static mut SLOT_91: usize = 0;
#[no_mangle]
pub static mut SLOT_92: usize = 0;
#[no_mangle]
pub static mut SLOT_93: usize = 0;
#[no_mangle]
pub static mut SLOT_94: usize = 0;
#[no_mangle]
pub static mut SLOT_95: usize = 0;
#[no_mangle]
pub static mut SLOT_96: usize = 0;
#[no_mangle]
pub static mut SLOT_97: usize = 0;
#[no_mangle]
pub static mut SLOT_98: usize = 0;
#[no_mangle]
pub static mut SLOT_99: usize = 0;
#[no_mangle]
pub static mut SLOT_100: usize = 0;
#[no_mangle]
pub static mut SLOT_101: usize = 0;
#[no_mangle]
pub static mut SLOT_102: usize = 0;
#[no_mangle]
pub static mut SLOT_103: usize = 0;
#[no_mangle]
pub static mut SLOT_104: usize = 0;
#[no_mangle]
pub static mut SLOT_105: usize = 0;
#[no_mangle]
pub static mut SLOT_106: usize = 0;
#[no_mangle]
pub static mut SLOT_107: usize = 0;
#[no_mangle]
pub static mut SLOT_108: usize = 0;
#[no_mangle]
pub static mut SLOT_109: usize = 0;
#[no_mangle]
pub static mut SLOT_110: usize = 0;
#[no_mangle]
pub static mut SLOT_111: usize = 0;
#[no_mangle]
pub static mut SLOT_112: usize = 0;
#[no_mangle]
pub static mut SLOT_113: usize = 0;
#[no_mangle]
pub static mut SLOT_114: usize = 0;
#[no_mangle]
pub static mut SLOT_115: usize = 0;
#[no_mangle]
pub static mut SLOT_116: usize = 0;
#[no_mangle]
pub static mut SLOT_117: usize = 0;
#[no_mangle]
pub static mut SLOT_118: usize = 0;
#[no_mangle]
pub static mut SLOT_119: usize = 0;
#[no_mangle]
pub static mut SLOT_120: usize = 0;
#[no_mangle]
pub static mut SLOT_121: usize = 0;
#[no_mangle]
pub static mut SLOT_122: usize = 0;
#[no_mangle]
pub static mut SLOT_123: usize = 0;
#[no_mangle]
pub static mut SLOT_124: usize = 0;
#[no_mangle]
pub static mut SLOT_125: usize = 0;
#[no_mangle]
pub static mut SLOT_126: usize = 0;
#[no_mangle]
pub static mut SLOT_127: usize = 0;
#[no_mangle]
pub static mut SLOT_128: usize = 0;
#[no_mangle]
pub static mut SLOT_129: usize = 0;
#[no_mangle]
pub static mut SLOT_130: usize = 0;
#[no_mangle]
pub static mut SLOT_131: usize = 0;
#[no_mangle]
pub static mut SLOT_132: usize = 0;
#[no_mangle]
pub static mut SLOT_133: usize = 0;
#[no_mangle]
pub static mut SLOT_134: usize = 0;
#[no_mangle]
pub static mut SLOT_135: usize = 0;
#[no_mangle]
pub static mut SLOT_136: usize = 0;
#[no_mangle]
pub static mut SLOT_137: usize = 0;
#[no_mangle]
pub static mut SLOT_138: usize = 0;
#[no_mangle]
pub static mut SLOT_139: usize = 0;
#[no_mangle]
pub static mut SLOT_140: usize = 0;
#[no_mangle]
pub static mut SLOT_141: usize = 0;
#[no_mangle]
pub static mut SLOT_142: usize = 0;
#[no_mangle]
pub static mut SLOT_143: usize = 0;
#[no_mangle]
pub static mut SLOT_144: usize = 0;
#[no_mangle]
pub static mut SLOT_145: usize = 0;
#[no_mangle]
pub static mut SLOT_146: usize = 0;
#[no_mangle]
pub static mut SLOT_147: usize = 0;
#[no_mangle]
pub static mut SLOT_148: usize = 0;
#[no_mangle]
pub static mut SLOT_149: usize = 0;
#[no_mangle]
pub static mut SLOT_150: usize = 0;
#[no_mangle]
pub static mut SLOT_151: usize = 0;
#[no_mangle]
pub static mut SLOT_152: usize = 0;
#[no_mangle]
pub static mut SLOT_153: usize = 0;
#[no_mangle]
pub static mut SLOT_154: usize = 0;
#[no_mangle]
pub static mut SLOT_155: usize = 0;
#[no_mangle]
pub static mut SLOT_156: usize = 0;
#[no_mangle]
pub static mut SLOT_157: usize = 0;
#[no_mangle]
pub static mut SLOT_158: usize = 0;
#[no_mangle]
pub static mut SLOT_159: usize = 0;
#[no_mangle]
pub static mut SLOT_160: usize = 0;
#[no_mangle]
pub static mut SLOT_161: usize = 0;
#[no_mangle]
pub static mut SLOT_162: usize = 0;
#[no_mangle]
pub static mut SLOT_163: usize = 0;
#[no_mangle]
pub static mut SLOT_164: usize = 0;
#[no_mangle]
pub static mut SLOT_165: usize = 0;
#[no_mangle]
pub static mut SLOT_166: usize = 0;
#[no_mangle]
pub static mut SLOT_167: usize = 0;
#[no_mangle]
pub static mut SLOT_168: usize = 0;
#[no_mangle]
pub static mut SLOT_169: usize = 0;
#[no_mangle]
pub static mut SLOT_170: usize = 0;
#[no_mangle]
pub static mut SLOT_171: usize = 0;
#[no_mangle]
pub static mut SLOT_172: usize = 0;
#[no_mangle]
pub static mut SLOT_173: usize = 0;
#[no_mangle]
pub static mut SLOT_174: usize = 0;
#[no_mangle]
pub static mut SLOT_175: usize = 0;
#[no_mangle]
pub static mut SLOT_176: usize = 0;
#[no_mangle]
pub static mut SLOT_177: usize = 0;
#[no_mangle]
pub static mut SLOT_178: usize = 0;
#[no_mangle]
pub static mut SLOT_179: usize = 0;

global_asm!(
r#"
.globl CloseDriver
CloseDriver:
    jmp qword ptr [rip + SLOT_0]
.globl DefDriverProc
DefDriverProc:
    jmp qword ptr [rip + SLOT_1]
.globl DriverCallback
DriverCallback:
    jmp qword ptr [rip + SLOT_2]
.globl DrvGetModuleHandle
DrvGetModuleHandle:
    jmp qword ptr [rip + SLOT_3]
.globl GetDriverModuleHandle
GetDriverModuleHandle:
    jmp qword ptr [rip + SLOT_4]
.globl OpenDriver
OpenDriver:
    jmp qword ptr [rip + SLOT_5]
.globl PlaySound
PlaySound:
    jmp qword ptr [rip + SLOT_6]
.globl PlaySoundA
PlaySoundA:
    jmp qword ptr [rip + SLOT_7]
.globl PlaySoundW
PlaySoundW:
    jmp qword ptr [rip + SLOT_8]
.globl SendDriverMessage
SendDriverMessage:
    jmp qword ptr [rip + SLOT_9]
.globl WOWAppExit
WOWAppExit:
    jmp qword ptr [rip + SLOT_10]
.globl auxGetDevCapsA
auxGetDevCapsA:
    jmp qword ptr [rip + SLOT_11]
.globl auxGetDevCapsW
auxGetDevCapsW:
    jmp qword ptr [rip + SLOT_12]
.globl auxGetNumDevs
auxGetNumDevs:
    jmp qword ptr [rip + SLOT_13]
.globl auxGetVolume
auxGetVolume:
    jmp qword ptr [rip + SLOT_14]
.globl auxOutMessage
auxOutMessage:
    jmp qword ptr [rip + SLOT_15]
.globl auxSetVolume
auxSetVolume:
    jmp qword ptr [rip + SLOT_16]
.globl joyConfigChanged
joyConfigChanged:
    jmp qword ptr [rip + SLOT_17]
.globl joyGetDevCapsA
joyGetDevCapsA:
    jmp qword ptr [rip + SLOT_18]
.globl joyGetDevCapsW
joyGetDevCapsW:
    jmp qword ptr [rip + SLOT_19]
.globl joyGetNumDevs
joyGetNumDevs:
    jmp qword ptr [rip + SLOT_20]
.globl joyGetPos
joyGetPos:
    jmp qword ptr [rip + SLOT_21]
.globl joyGetPosEx
joyGetPosEx:
    jmp qword ptr [rip + SLOT_22]
.globl joyGetThreshold
joyGetThreshold:
    jmp qword ptr [rip + SLOT_23]
.globl joyReleaseCapture
joyReleaseCapture:
    jmp qword ptr [rip + SLOT_24]
.globl joySetCapture
joySetCapture:
    jmp qword ptr [rip + SLOT_25]
.globl joySetThreshold
joySetThreshold:
    jmp qword ptr [rip + SLOT_26]
.globl mciDriverNotify
mciDriverNotify:
    jmp qword ptr [rip + SLOT_27]
.globl mciDriverYield
mciDriverYield:
    jmp qword ptr [rip + SLOT_28]
.globl mciExecute
mciExecute:
    jmp qword ptr [rip + SLOT_29]
.globl mciFreeCommandResource
mciFreeCommandResource:
    jmp qword ptr [rip + SLOT_30]
.globl mciGetCreatorTask
mciGetCreatorTask:
    jmp qword ptr [rip + SLOT_31]
.globl mciGetDeviceIDA
mciGetDeviceIDA:
    jmp qword ptr [rip + SLOT_32]
.globl mciGetDeviceIDFromElementIDA
mciGetDeviceIDFromElementIDA:
    jmp qword ptr [rip + SLOT_33]
.globl mciGetDeviceIDFromElementIDW
mciGetDeviceIDFromElementIDW:
    jmp qword ptr [rip + SLOT_34]
.globl mciGetDeviceIDW
mciGetDeviceIDW:
    jmp qword ptr [rip + SLOT_35]
.globl mciGetDriverData
mciGetDriverData:
    jmp qword ptr [rip + SLOT_36]
.globl mciGetErrorStringA
mciGetErrorStringA:
    jmp qword ptr [rip + SLOT_37]
.globl mciGetErrorStringW
mciGetErrorStringW:
    jmp qword ptr [rip + SLOT_38]
.globl mciGetYieldProc
mciGetYieldProc:
    jmp qword ptr [rip + SLOT_39]
.globl mciLoadCommandResource
mciLoadCommandResource:
    jmp qword ptr [rip + SLOT_40]
.globl mciSendCommandA
mciSendCommandA:
    jmp qword ptr [rip + SLOT_41]
.globl mciSendCommandW
mciSendCommandW:
    jmp qword ptr [rip + SLOT_42]
.globl mciSendStringA
mciSendStringA:
    jmp qword ptr [rip + SLOT_43]
.globl mciSendStringW
mciSendStringW:
    jmp qword ptr [rip + SLOT_44]
.globl mciSetDriverData
mciSetDriverData:
    jmp qword ptr [rip + SLOT_45]
.globl mciSetYieldProc
mciSetYieldProc:
    jmp qword ptr [rip + SLOT_46]
.globl midiConnect
midiConnect:
    jmp qword ptr [rip + SLOT_47]
.globl midiDisconnect
midiDisconnect:
    jmp qword ptr [rip + SLOT_48]
.globl midiInAddBuffer
midiInAddBuffer:
    jmp qword ptr [rip + SLOT_49]
.globl midiInClose
midiInClose:
    jmp qword ptr [rip + SLOT_50]
.globl midiInGetDevCapsA
midiInGetDevCapsA:
    jmp qword ptr [rip + SLOT_51]
.globl midiInGetDevCapsW
midiInGetDevCapsW:
    jmp qword ptr [rip + SLOT_52]
.globl midiInGetErrorTextA
midiInGetErrorTextA:
    jmp qword ptr [rip + SLOT_53]
.globl midiInGetErrorTextW
midiInGetErrorTextW:
    jmp qword ptr [rip + SLOT_54]
.globl midiInGetID
midiInGetID:
    jmp qword ptr [rip + SLOT_55]
.globl midiInGetNumDevs
midiInGetNumDevs:
    jmp qword ptr [rip + SLOT_56]
.globl midiInMessage
midiInMessage:
    jmp qword ptr [rip + SLOT_57]
.globl midiInOpen
midiInOpen:
    jmp qword ptr [rip + SLOT_58]
.globl midiInPrepareHeader
midiInPrepareHeader:
    jmp qword ptr [rip + SLOT_59]
.globl midiInReset
midiInReset:
    jmp qword ptr [rip + SLOT_60]
.globl midiInStart
midiInStart:
    jmp qword ptr [rip + SLOT_61]
.globl midiInStop
midiInStop:
    jmp qword ptr [rip + SLOT_62]
.globl midiInUnprepareHeader
midiInUnprepareHeader:
    jmp qword ptr [rip + SLOT_63]
.globl midiOutCacheDrumPatches
midiOutCacheDrumPatches:
    jmp qword ptr [rip + SLOT_64]
.globl midiOutCachePatches
midiOutCachePatches:
    jmp qword ptr [rip + SLOT_65]
.globl midiOutClose
midiOutClose:
    jmp qword ptr [rip + SLOT_66]
.globl midiOutGetDevCapsA
midiOutGetDevCapsA:
    jmp qword ptr [rip + SLOT_67]
.globl midiOutGetDevCapsW
midiOutGetDevCapsW:
    jmp qword ptr [rip + SLOT_68]
.globl midiOutGetErrorTextA
midiOutGetErrorTextA:
    jmp qword ptr [rip + SLOT_69]
.globl midiOutGetErrorTextW
midiOutGetErrorTextW:
    jmp qword ptr [rip + SLOT_70]
.globl midiOutGetID
midiOutGetID:
    jmp qword ptr [rip + SLOT_71]
.globl midiOutGetNumDevs
midiOutGetNumDevs:
    jmp qword ptr [rip + SLOT_72]
.globl midiOutGetVolume
midiOutGetVolume:
    jmp qword ptr [rip + SLOT_73]
.globl midiOutLongMsg
midiOutLongMsg:
    jmp qword ptr [rip + SLOT_74]
.globl midiOutMessage
midiOutMessage:
    jmp qword ptr [rip + SLOT_75]
.globl midiOutOpen
midiOutOpen:
    jmp qword ptr [rip + SLOT_76]
.globl midiOutPrepareHeader
midiOutPrepareHeader:
    jmp qword ptr [rip + SLOT_77]
.globl midiOutReset
midiOutReset:
    jmp qword ptr [rip + SLOT_78]
.globl midiOutSetVolume
midiOutSetVolume:
    jmp qword ptr [rip + SLOT_79]
.globl midiOutShortMsg
midiOutShortMsg:
    jmp qword ptr [rip + SLOT_80]
.globl midiOutUnprepareHeader
midiOutUnprepareHeader:
    jmp qword ptr [rip + SLOT_81]
.globl midiStreamClose
midiStreamClose:
    jmp qword ptr [rip + SLOT_82]
.globl midiStreamOpen
midiStreamOpen:
    jmp qword ptr [rip + SLOT_83]
.globl midiStreamOut
midiStreamOut:
    jmp qword ptr [rip + SLOT_84]
.globl midiStreamPause
midiStreamPause:
    jmp qword ptr [rip + SLOT_85]
.globl midiStreamPosition
midiStreamPosition:
    jmp qword ptr [rip + SLOT_86]
.globl midiStreamProperty
midiStreamProperty:
    jmp qword ptr [rip + SLOT_87]
.globl midiStreamRestart
midiStreamRestart:
    jmp qword ptr [rip + SLOT_88]
.globl midiStreamStop
midiStreamStop:
    jmp qword ptr [rip + SLOT_89]
.globl mixerClose
mixerClose:
    jmp qword ptr [rip + SLOT_90]
.globl mixerGetControlDetailsA
mixerGetControlDetailsA:
    jmp qword ptr [rip + SLOT_91]
.globl mixerGetControlDetailsW
mixerGetControlDetailsW:
    jmp qword ptr [rip + SLOT_92]
.globl mixerGetDevCapsA
mixerGetDevCapsA:
    jmp qword ptr [rip + SLOT_93]
.globl mixerGetDevCapsW
mixerGetDevCapsW:
    jmp qword ptr [rip + SLOT_94]
.globl mixerGetID
mixerGetID:
    jmp qword ptr [rip + SLOT_95]
.globl mixerGetLineControlsA
mixerGetLineControlsA:
    jmp qword ptr [rip + SLOT_96]
.globl mixerGetLineControlsW
mixerGetLineControlsW:
    jmp qword ptr [rip + SLOT_97]
.globl mixerGetLineInfoA
mixerGetLineInfoA:
    jmp qword ptr [rip + SLOT_98]
.globl mixerGetLineInfoW
mixerGetLineInfoW:
    jmp qword ptr [rip + SLOT_99]
.globl mixerGetNumDevs
mixerGetNumDevs:
    jmp qword ptr [rip + SLOT_100]
.globl mixerMessage
mixerMessage:
    jmp qword ptr [rip + SLOT_101]
.globl mixerOpen
mixerOpen:
    jmp qword ptr [rip + SLOT_102]
.globl mixerSetControlDetails
mixerSetControlDetails:
    jmp qword ptr [rip + SLOT_103]
.globl mmDrvInstall
mmDrvInstall:
    jmp qword ptr [rip + SLOT_104]
.globl mmGetCurrentTask
mmGetCurrentTask:
    jmp qword ptr [rip + SLOT_105]
.globl mmTaskBlock
mmTaskBlock:
    jmp qword ptr [rip + SLOT_106]
.globl mmTaskCreate
mmTaskCreate:
    jmp qword ptr [rip + SLOT_107]
.globl mmTaskSignal
mmTaskSignal:
    jmp qword ptr [rip + SLOT_108]
.globl mmTaskYield
mmTaskYield:
    jmp qword ptr [rip + SLOT_109]
.globl mmioAdvance
mmioAdvance:
    jmp qword ptr [rip + SLOT_110]
.globl mmioAscend
mmioAscend:
    jmp qword ptr [rip + SLOT_111]
.globl mmioClose
mmioClose:
    jmp qword ptr [rip + SLOT_112]
.globl mmioCreateChunk
mmioCreateChunk:
    jmp qword ptr [rip + SLOT_113]
.globl mmioDescend
mmioDescend:
    jmp qword ptr [rip + SLOT_114]
.globl mmioFlush
mmioFlush:
    jmp qword ptr [rip + SLOT_115]
.globl mmioGetInfo
mmioGetInfo:
    jmp qword ptr [rip + SLOT_116]
.globl mmioInstallIOProcA
mmioInstallIOProcA:
    jmp qword ptr [rip + SLOT_117]
.globl mmioInstallIOProcW
mmioInstallIOProcW:
    jmp qword ptr [rip + SLOT_118]
.globl mmioOpenA
mmioOpenA:
    jmp qword ptr [rip + SLOT_119]
.globl mmioOpenW
mmioOpenW:
    jmp qword ptr [rip + SLOT_120]
.globl mmioRead
mmioRead:
    jmp qword ptr [rip + SLOT_121]
.globl mmioRenameA
mmioRenameA:
    jmp qword ptr [rip + SLOT_122]
.globl mmioRenameW
mmioRenameW:
    jmp qword ptr [rip + SLOT_123]
.globl mmioSeek
mmioSeek:
    jmp qword ptr [rip + SLOT_124]
.globl mmioSendMessage
mmioSendMessage:
    jmp qword ptr [rip + SLOT_125]
.globl mmioSetBuffer
mmioSetBuffer:
    jmp qword ptr [rip + SLOT_126]
.globl mmioSetInfo
mmioSetInfo:
    jmp qword ptr [rip + SLOT_127]
.globl mmioStringToFOURCCA
mmioStringToFOURCCA:
    jmp qword ptr [rip + SLOT_128]
.globl mmioStringToFOURCCW
mmioStringToFOURCCW:
    jmp qword ptr [rip + SLOT_129]
.globl mmioWrite
mmioWrite:
    jmp qword ptr [rip + SLOT_130]
.globl mmsystemGetVersion
mmsystemGetVersion:
    jmp qword ptr [rip + SLOT_131]
.globl sndPlaySoundA
sndPlaySoundA:
    jmp qword ptr [rip + SLOT_132]
.globl sndPlaySoundW
sndPlaySoundW:
    jmp qword ptr [rip + SLOT_133]
.globl timeBeginPeriod
timeBeginPeriod:
    jmp qword ptr [rip + SLOT_134]
.globl timeEndPeriod
timeEndPeriod:
    jmp qword ptr [rip + SLOT_135]
.globl timeGetDevCaps
timeGetDevCaps:
    jmp qword ptr [rip + SLOT_136]
.globl timeGetSystemTime
timeGetSystemTime:
    jmp qword ptr [rip + SLOT_137]
.globl timeGetTime
timeGetTime:
    jmp qword ptr [rip + SLOT_138]
.globl timeKillEvent
timeKillEvent:
    jmp qword ptr [rip + SLOT_139]
.globl timeSetEvent
timeSetEvent:
    jmp qword ptr [rip + SLOT_140]
.globl waveInAddBuffer
waveInAddBuffer:
    jmp qword ptr [rip + SLOT_141]
.globl waveInClose
waveInClose:
    jmp qword ptr [rip + SLOT_142]
.globl waveInGetDevCapsA
waveInGetDevCapsA:
    jmp qword ptr [rip + SLOT_143]
.globl waveInGetDevCapsW
waveInGetDevCapsW:
    jmp qword ptr [rip + SLOT_144]
.globl waveInGetErrorTextA
waveInGetErrorTextA:
    jmp qword ptr [rip + SLOT_145]
.globl waveInGetErrorTextW
waveInGetErrorTextW:
    jmp qword ptr [rip + SLOT_146]
.globl waveInGetID
waveInGetID:
    jmp qword ptr [rip + SLOT_147]
.globl waveInGetNumDevs
waveInGetNumDevs:
    jmp qword ptr [rip + SLOT_148]
.globl waveInGetPosition
waveInGetPosition:
    jmp qword ptr [rip + SLOT_149]
.globl waveInMessage
waveInMessage:
    jmp qword ptr [rip + SLOT_150]
.globl waveInOpen
waveInOpen:
    jmp qword ptr [rip + SLOT_151]
.globl waveInPrepareHeader
waveInPrepareHeader:
    jmp qword ptr [rip + SLOT_152]
.globl waveInReset
waveInReset:
    jmp qword ptr [rip + SLOT_153]
.globl waveInStart
waveInStart:
    jmp qword ptr [rip + SLOT_154]
.globl waveInStop
waveInStop:
    jmp qword ptr [rip + SLOT_155]
.globl waveInUnprepareHeader
waveInUnprepareHeader:
    jmp qword ptr [rip + SLOT_156]
.globl waveOutBreakLoop
waveOutBreakLoop:
    jmp qword ptr [rip + SLOT_157]
.globl waveOutClose
waveOutClose:
    jmp qword ptr [rip + SLOT_158]
.globl waveOutGetDevCapsA
waveOutGetDevCapsA:
    jmp qword ptr [rip + SLOT_159]
.globl waveOutGetDevCapsW
waveOutGetDevCapsW:
    jmp qword ptr [rip + SLOT_160]
.globl waveOutGetErrorTextA
waveOutGetErrorTextA:
    jmp qword ptr [rip + SLOT_161]
.globl waveOutGetErrorTextW
waveOutGetErrorTextW:
    jmp qword ptr [rip + SLOT_162]
.globl waveOutGetID
waveOutGetID:
    jmp qword ptr [rip + SLOT_163]
.globl waveOutGetNumDevs
waveOutGetNumDevs:
    jmp qword ptr [rip + SLOT_164]
.globl waveOutGetPitch
waveOutGetPitch:
    jmp qword ptr [rip + SLOT_165]
.globl waveOutGetPlaybackRate
waveOutGetPlaybackRate:
    jmp qword ptr [rip + SLOT_166]
.globl waveOutGetPosition
waveOutGetPosition:
    jmp qword ptr [rip + SLOT_167]
.globl waveOutGetVolume
waveOutGetVolume:
    jmp qword ptr [rip + SLOT_168]
.globl waveOutMessage
waveOutMessage:
    jmp qword ptr [rip + SLOT_169]
.globl waveOutOpen
waveOutOpen:
    jmp qword ptr [rip + SLOT_170]
.globl waveOutPause
waveOutPause:
    jmp qword ptr [rip + SLOT_171]
.globl waveOutPrepareHeader
waveOutPrepareHeader:
    jmp qword ptr [rip + SLOT_172]
.globl waveOutReset
waveOutReset:
    jmp qword ptr [rip + SLOT_173]
.globl waveOutRestart
waveOutRestart:
    jmp qword ptr [rip + SLOT_174]
.globl waveOutSetPitch
waveOutSetPitch:
    jmp qword ptr [rip + SLOT_175]
.globl waveOutSetPlaybackRate
waveOutSetPlaybackRate:
    jmp qword ptr [rip + SLOT_176]
.globl waveOutSetVolume
waveOutSetVolume:
    jmp qword ptr [rip + SLOT_177]
.globl waveOutUnprepareHeader
waveOutUnprepareHeader:
    jmp qword ptr [rip + SLOT_178]
.globl waveOutWrite
waveOutWrite:
    jmp qword ptr [rip + SLOT_179]
"#
);

fn wide(s: &str) -> Vec<u16> { s.encode_utf16().chain(std::iter::once(0)).collect() }

fn log_line(tag: &str) {
    unsafe {
        let path = wide(r"C:\AI\RD\Tool\mcp\typora-license-audit\exports\winmm.log");
        let h = CreateFileW(path.as_ptr(), 0x40000000, 3, std::ptr::null_mut(), 4, 0x80, std::ptr::null_mut());
        if h as isize == -1 { return; }
        extern "system" { fn SetFilePointer(h: HANDLE, lo: i32, hi: *mut i32, method: DWORD) -> DWORD; }
        SetFilePointer(h, 0, std::ptr::null_mut(), 2);
        let mut ft: u64 = 0; GetSystemTimeAsFileTime(&mut ft);
        let line = format!("[{}] pid={} ft={}\n", tag, GetCurrentProcessId(), ft);
        let mut w: DWORD = 0;
        WriteFile(h, line.as_ptr(), line.len() as DWORD, &mut w, std::ptr::null_mut());
        CloseHandle(h);
    }
}

#[no_mangle]
pub extern "system" fn typora_resolve(base: HANDLE) -> usize {
    let stub = typora_stub_zero as usize;
    let mut resolved = 0usize;
    unsafe {
    { let p = GetProcAddress(base, b"CloseDriver\x00".as_ptr()); SLOT_0 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"DefDriverProc\x00".as_ptr()); SLOT_1 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"DriverCallback\x00".as_ptr()); SLOT_2 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"DrvGetModuleHandle\x00".as_ptr()); SLOT_3 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"GetDriverModuleHandle\x00".as_ptr()); SLOT_4 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"OpenDriver\x00".as_ptr()); SLOT_5 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"PlaySound\x00".as_ptr()); SLOT_6 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"PlaySoundA\x00".as_ptr()); SLOT_7 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"PlaySoundW\x00".as_ptr()); SLOT_8 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"SendDriverMessage\x00".as_ptr()); SLOT_9 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"WOWAppExit\x00".as_ptr()); SLOT_10 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"auxGetDevCapsA\x00".as_ptr()); SLOT_11 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"auxGetDevCapsW\x00".as_ptr()); SLOT_12 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"auxGetNumDevs\x00".as_ptr()); SLOT_13 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"auxGetVolume\x00".as_ptr()); SLOT_14 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"auxOutMessage\x00".as_ptr()); SLOT_15 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"auxSetVolume\x00".as_ptr()); SLOT_16 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"joyConfigChanged\x00".as_ptr()); SLOT_17 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"joyGetDevCapsA\x00".as_ptr()); SLOT_18 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"joyGetDevCapsW\x00".as_ptr()); SLOT_19 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"joyGetNumDevs\x00".as_ptr()); SLOT_20 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"joyGetPos\x00".as_ptr()); SLOT_21 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"joyGetPosEx\x00".as_ptr()); SLOT_22 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"joyGetThreshold\x00".as_ptr()); SLOT_23 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"joyReleaseCapture\x00".as_ptr()); SLOT_24 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"joySetCapture\x00".as_ptr()); SLOT_25 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"joySetThreshold\x00".as_ptr()); SLOT_26 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mciDriverNotify\x00".as_ptr()); SLOT_27 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mciDriverYield\x00".as_ptr()); SLOT_28 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mciExecute\x00".as_ptr()); SLOT_29 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mciFreeCommandResource\x00".as_ptr()); SLOT_30 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mciGetCreatorTask\x00".as_ptr()); SLOT_31 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mciGetDeviceIDA\x00".as_ptr()); SLOT_32 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mciGetDeviceIDFromElementIDA\x00".as_ptr()); SLOT_33 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mciGetDeviceIDFromElementIDW\x00".as_ptr()); SLOT_34 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mciGetDeviceIDW\x00".as_ptr()); SLOT_35 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mciGetDriverData\x00".as_ptr()); SLOT_36 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mciGetErrorStringA\x00".as_ptr()); SLOT_37 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mciGetErrorStringW\x00".as_ptr()); SLOT_38 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mciGetYieldProc\x00".as_ptr()); SLOT_39 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mciLoadCommandResource\x00".as_ptr()); SLOT_40 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mciSendCommandA\x00".as_ptr()); SLOT_41 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mciSendCommandW\x00".as_ptr()); SLOT_42 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mciSendStringA\x00".as_ptr()); SLOT_43 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mciSendStringW\x00".as_ptr()); SLOT_44 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mciSetDriverData\x00".as_ptr()); SLOT_45 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mciSetYieldProc\x00".as_ptr()); SLOT_46 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiConnect\x00".as_ptr()); SLOT_47 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiDisconnect\x00".as_ptr()); SLOT_48 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiInAddBuffer\x00".as_ptr()); SLOT_49 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiInClose\x00".as_ptr()); SLOT_50 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiInGetDevCapsA\x00".as_ptr()); SLOT_51 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiInGetDevCapsW\x00".as_ptr()); SLOT_52 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiInGetErrorTextA\x00".as_ptr()); SLOT_53 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiInGetErrorTextW\x00".as_ptr()); SLOT_54 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiInGetID\x00".as_ptr()); SLOT_55 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiInGetNumDevs\x00".as_ptr()); SLOT_56 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiInMessage\x00".as_ptr()); SLOT_57 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiInOpen\x00".as_ptr()); SLOT_58 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiInPrepareHeader\x00".as_ptr()); SLOT_59 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiInReset\x00".as_ptr()); SLOT_60 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiInStart\x00".as_ptr()); SLOT_61 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiInStop\x00".as_ptr()); SLOT_62 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiInUnprepareHeader\x00".as_ptr()); SLOT_63 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiOutCacheDrumPatches\x00".as_ptr()); SLOT_64 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiOutCachePatches\x00".as_ptr()); SLOT_65 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiOutClose\x00".as_ptr()); SLOT_66 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiOutGetDevCapsA\x00".as_ptr()); SLOT_67 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiOutGetDevCapsW\x00".as_ptr()); SLOT_68 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiOutGetErrorTextA\x00".as_ptr()); SLOT_69 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiOutGetErrorTextW\x00".as_ptr()); SLOT_70 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiOutGetID\x00".as_ptr()); SLOT_71 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiOutGetNumDevs\x00".as_ptr()); SLOT_72 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiOutGetVolume\x00".as_ptr()); SLOT_73 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiOutLongMsg\x00".as_ptr()); SLOT_74 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiOutMessage\x00".as_ptr()); SLOT_75 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiOutOpen\x00".as_ptr()); SLOT_76 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiOutPrepareHeader\x00".as_ptr()); SLOT_77 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiOutReset\x00".as_ptr()); SLOT_78 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiOutSetVolume\x00".as_ptr()); SLOT_79 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiOutShortMsg\x00".as_ptr()); SLOT_80 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiOutUnprepareHeader\x00".as_ptr()); SLOT_81 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiStreamClose\x00".as_ptr()); SLOT_82 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiStreamOpen\x00".as_ptr()); SLOT_83 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiStreamOut\x00".as_ptr()); SLOT_84 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiStreamPause\x00".as_ptr()); SLOT_85 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiStreamPosition\x00".as_ptr()); SLOT_86 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiStreamProperty\x00".as_ptr()); SLOT_87 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiStreamRestart\x00".as_ptr()); SLOT_88 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"midiStreamStop\x00".as_ptr()); SLOT_89 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mixerClose\x00".as_ptr()); SLOT_90 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mixerGetControlDetailsA\x00".as_ptr()); SLOT_91 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mixerGetControlDetailsW\x00".as_ptr()); SLOT_92 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mixerGetDevCapsA\x00".as_ptr()); SLOT_93 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mixerGetDevCapsW\x00".as_ptr()); SLOT_94 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mixerGetID\x00".as_ptr()); SLOT_95 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mixerGetLineControlsA\x00".as_ptr()); SLOT_96 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mixerGetLineControlsW\x00".as_ptr()); SLOT_97 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mixerGetLineInfoA\x00".as_ptr()); SLOT_98 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mixerGetLineInfoW\x00".as_ptr()); SLOT_99 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mixerGetNumDevs\x00".as_ptr()); SLOT_100 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mixerMessage\x00".as_ptr()); SLOT_101 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mixerOpen\x00".as_ptr()); SLOT_102 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mixerSetControlDetails\x00".as_ptr()); SLOT_103 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmDrvInstall\x00".as_ptr()); SLOT_104 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmGetCurrentTask\x00".as_ptr()); SLOT_105 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmTaskBlock\x00".as_ptr()); SLOT_106 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmTaskCreate\x00".as_ptr()); SLOT_107 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmTaskSignal\x00".as_ptr()); SLOT_108 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmTaskYield\x00".as_ptr()); SLOT_109 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmioAdvance\x00".as_ptr()); SLOT_110 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmioAscend\x00".as_ptr()); SLOT_111 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmioClose\x00".as_ptr()); SLOT_112 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmioCreateChunk\x00".as_ptr()); SLOT_113 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmioDescend\x00".as_ptr()); SLOT_114 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmioFlush\x00".as_ptr()); SLOT_115 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmioGetInfo\x00".as_ptr()); SLOT_116 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmioInstallIOProcA\x00".as_ptr()); SLOT_117 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmioInstallIOProcW\x00".as_ptr()); SLOT_118 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmioOpenA\x00".as_ptr()); SLOT_119 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmioOpenW\x00".as_ptr()); SLOT_120 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmioRead\x00".as_ptr()); SLOT_121 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmioRenameA\x00".as_ptr()); SLOT_122 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmioRenameW\x00".as_ptr()); SLOT_123 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmioSeek\x00".as_ptr()); SLOT_124 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmioSendMessage\x00".as_ptr()); SLOT_125 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmioSetBuffer\x00".as_ptr()); SLOT_126 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmioSetInfo\x00".as_ptr()); SLOT_127 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmioStringToFOURCCA\x00".as_ptr()); SLOT_128 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmioStringToFOURCCW\x00".as_ptr()); SLOT_129 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmioWrite\x00".as_ptr()); SLOT_130 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"mmsystemGetVersion\x00".as_ptr()); SLOT_131 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"sndPlaySoundA\x00".as_ptr()); SLOT_132 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"sndPlaySoundW\x00".as_ptr()); SLOT_133 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"timeBeginPeriod\x00".as_ptr()); SLOT_134 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"timeEndPeriod\x00".as_ptr()); SLOT_135 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"timeGetDevCaps\x00".as_ptr()); SLOT_136 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"timeGetSystemTime\x00".as_ptr()); SLOT_137 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"timeGetTime\x00".as_ptr()); SLOT_138 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"timeKillEvent\x00".as_ptr()); SLOT_139 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"timeSetEvent\x00".as_ptr()); SLOT_140 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveInAddBuffer\x00".as_ptr()); SLOT_141 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveInClose\x00".as_ptr()); SLOT_142 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveInGetDevCapsA\x00".as_ptr()); SLOT_143 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveInGetDevCapsW\x00".as_ptr()); SLOT_144 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveInGetErrorTextA\x00".as_ptr()); SLOT_145 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveInGetErrorTextW\x00".as_ptr()); SLOT_146 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveInGetID\x00".as_ptr()); SLOT_147 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveInGetNumDevs\x00".as_ptr()); SLOT_148 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveInGetPosition\x00".as_ptr()); SLOT_149 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveInMessage\x00".as_ptr()); SLOT_150 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveInOpen\x00".as_ptr()); SLOT_151 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveInPrepareHeader\x00".as_ptr()); SLOT_152 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveInReset\x00".as_ptr()); SLOT_153 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveInStart\x00".as_ptr()); SLOT_154 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveInStop\x00".as_ptr()); SLOT_155 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveInUnprepareHeader\x00".as_ptr()); SLOT_156 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveOutBreakLoop\x00".as_ptr()); SLOT_157 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveOutClose\x00".as_ptr()); SLOT_158 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveOutGetDevCapsA\x00".as_ptr()); SLOT_159 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveOutGetDevCapsW\x00".as_ptr()); SLOT_160 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveOutGetErrorTextA\x00".as_ptr()); SLOT_161 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveOutGetErrorTextW\x00".as_ptr()); SLOT_162 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveOutGetID\x00".as_ptr()); SLOT_163 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveOutGetNumDevs\x00".as_ptr()); SLOT_164 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveOutGetPitch\x00".as_ptr()); SLOT_165 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveOutGetPlaybackRate\x00".as_ptr()); SLOT_166 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveOutGetPosition\x00".as_ptr()); SLOT_167 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveOutGetVolume\x00".as_ptr()); SLOT_168 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveOutMessage\x00".as_ptr()); SLOT_169 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveOutOpen\x00".as_ptr()); SLOT_170 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveOutPause\x00".as_ptr()); SLOT_171 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveOutPrepareHeader\x00".as_ptr()); SLOT_172 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveOutReset\x00".as_ptr()); SLOT_173 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveOutRestart\x00".as_ptr()); SLOT_174 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveOutSetPitch\x00".as_ptr()); SLOT_175 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveOutSetPlaybackRate\x00".as_ptr()); SLOT_176 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveOutSetVolume\x00".as_ptr()); SLOT_177 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveOutUnprepareHeader\x00".as_ptr()); SLOT_178 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    { let p = GetProcAddress(base, b"waveOutWrite\x00".as_ptr()); SLOT_179 = if p.is_null() { stub } else { p as usize }; if !p.is_null() { resolved += 1; } }
    }
    resolved
}

#[no_mangle]
pub extern "system" fn DllMain(_h: HANDLE, reason: DWORD, _r: *mut c_void) -> BOOL {
    match reason {
        1 => {
            unsafe {
                let stub = typora_stub_zero as usize;
                SLOT_0 = stub;
                SLOT_1 = stub;
                SLOT_2 = stub;
                SLOT_3 = stub;
                SLOT_4 = stub;
                SLOT_5 = stub;
                SLOT_6 = stub;
                SLOT_7 = stub;
                SLOT_8 = stub;
                SLOT_9 = stub;
                SLOT_10 = stub;
                SLOT_11 = stub;
                SLOT_12 = stub;
                SLOT_13 = stub;
                SLOT_14 = stub;
                SLOT_15 = stub;
                SLOT_16 = stub;
                SLOT_17 = stub;
                SLOT_18 = stub;
                SLOT_19 = stub;
                SLOT_20 = stub;
                SLOT_21 = stub;
                SLOT_22 = stub;
                SLOT_23 = stub;
                SLOT_24 = stub;
                SLOT_25 = stub;
                SLOT_26 = stub;
                SLOT_27 = stub;
                SLOT_28 = stub;
                SLOT_29 = stub;
                SLOT_30 = stub;
                SLOT_31 = stub;
                SLOT_32 = stub;
                SLOT_33 = stub;
                SLOT_34 = stub;
                SLOT_35 = stub;
                SLOT_36 = stub;
                SLOT_37 = stub;
                SLOT_38 = stub;
                SLOT_39 = stub;
                SLOT_40 = stub;
                SLOT_41 = stub;
                SLOT_42 = stub;
                SLOT_43 = stub;
                SLOT_44 = stub;
                SLOT_45 = stub;
                SLOT_46 = stub;
                SLOT_47 = stub;
                SLOT_48 = stub;
                SLOT_49 = stub;
                SLOT_50 = stub;
                SLOT_51 = stub;
                SLOT_52 = stub;
                SLOT_53 = stub;
                SLOT_54 = stub;
                SLOT_55 = stub;
                SLOT_56 = stub;
                SLOT_57 = stub;
                SLOT_58 = stub;
                SLOT_59 = stub;
                SLOT_60 = stub;
                SLOT_61 = stub;
                SLOT_62 = stub;
                SLOT_63 = stub;
                SLOT_64 = stub;
                SLOT_65 = stub;
                SLOT_66 = stub;
                SLOT_67 = stub;
                SLOT_68 = stub;
                SLOT_69 = stub;
                SLOT_70 = stub;
                SLOT_71 = stub;
                SLOT_72 = stub;
                SLOT_73 = stub;
                SLOT_74 = stub;
                SLOT_75 = stub;
                SLOT_76 = stub;
                SLOT_77 = stub;
                SLOT_78 = stub;
                SLOT_79 = stub;
                SLOT_80 = stub;
                SLOT_81 = stub;
                SLOT_82 = stub;
                SLOT_83 = stub;
                SLOT_84 = stub;
                SLOT_85 = stub;
                SLOT_86 = stub;
                SLOT_87 = stub;
                SLOT_88 = stub;
                SLOT_89 = stub;
                SLOT_90 = stub;
                SLOT_91 = stub;
                SLOT_92 = stub;
                SLOT_93 = stub;
                SLOT_94 = stub;
                SLOT_95 = stub;
                SLOT_96 = stub;
                SLOT_97 = stub;
                SLOT_98 = stub;
                SLOT_99 = stub;
                SLOT_100 = stub;
                SLOT_101 = stub;
                SLOT_102 = stub;
                SLOT_103 = stub;
                SLOT_104 = stub;
                SLOT_105 = stub;
                SLOT_106 = stub;
                SLOT_107 = stub;
                SLOT_108 = stub;
                SLOT_109 = stub;
                SLOT_110 = stub;
                SLOT_111 = stub;
                SLOT_112 = stub;
                SLOT_113 = stub;
                SLOT_114 = stub;
                SLOT_115 = stub;
                SLOT_116 = stub;
                SLOT_117 = stub;
                SLOT_118 = stub;
                SLOT_119 = stub;
                SLOT_120 = stub;
                SLOT_121 = stub;
                SLOT_122 = stub;
                SLOT_123 = stub;
                SLOT_124 = stub;
                SLOT_125 = stub;
                SLOT_126 = stub;
                SLOT_127 = stub;
                SLOT_128 = stub;
                SLOT_129 = stub;
                SLOT_130 = stub;
                SLOT_131 = stub;
                SLOT_132 = stub;
                SLOT_133 = stub;
                SLOT_134 = stub;
                SLOT_135 = stub;
                SLOT_136 = stub;
                SLOT_137 = stub;
                SLOT_138 = stub;
                SLOT_139 = stub;
                SLOT_140 = stub;
                SLOT_141 = stub;
                SLOT_142 = stub;
                SLOT_143 = stub;
                SLOT_144 = stub;
                SLOT_145 = stub;
                SLOT_146 = stub;
                SLOT_147 = stub;
                SLOT_148 = stub;
                SLOT_149 = stub;
                SLOT_150 = stub;
                SLOT_151 = stub;
                SLOT_152 = stub;
                SLOT_153 = stub;
                SLOT_154 = stub;
                SLOT_155 = stub;
                SLOT_156 = stub;
                SLOT_157 = stub;
                SLOT_158 = stub;
                SLOT_159 = stub;
                SLOT_160 = stub;
                SLOT_161 = stub;
                SLOT_162 = stub;
                SLOT_163 = stub;
                SLOT_164 = stub;
                SLOT_165 = stub;
                SLOT_166 = stub;
                SLOT_167 = stub;
                SLOT_168 = stub;
                SLOT_169 = stub;
                SLOT_170 = stub;
                SLOT_171 = stub;
                SLOT_172 = stub;
                SLOT_173 = stub;
                SLOT_174 = stub;
                SLOT_175 = stub;
                SLOT_176 = stub;
                SLOT_177 = stub;
                SLOT_178 = stub;
                SLOT_179 = stub;
                let name = wide("winmm_real.dll");
                let mut base = LoadLibraryW(name.as_ptr());
                if base.is_null() { base = GetModuleHandleW(wide("winmm.dll").as_ptr()); }
                let n = if base.is_null() { 0 } else { typora_resolve(base) };
                install_native();
                log_line(&format!("DLL_PROCESS_ATTACH resolved={}/180", n));
            }
        }
        0 => log_line("DLL_PROCESS_DETACH"),
        _ => {}
    }
    1
}
include!("hook.rs");
