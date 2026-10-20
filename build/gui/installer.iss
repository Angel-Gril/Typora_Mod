; Typora 离线注册器 —— Inno Setup 安装脚本
; 编译: ISCC.exe installer.iss

#define MyAppName "Typora 离线注册器"
#ifndef MyAppVersion
  #define MyAppVersion "1.0"
#endif
#ifndef MyAppVersionFull
  #define MyAppVersionFull "1.0.0.0"
#endif
#define MyAppPublisher "Seep Lab"
#define MyAppExeName "TyporaSetup.exe"
#define MyAppId "{{7C1E5B42-9D3A-4F87-A6E1-2B4C8D5F0A93}"

[Setup]
AppId={#MyAppId}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\Programs\TyporaVirt
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=..\..\dist
OutputBaseFilename=TyporaVirt-Setup-{#MyAppVersion}
SetupIconFile=typora-virt.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
ShowLanguageDialog=no
VersionInfoVersion={#MyAppVersionFull}
VersionInfoDescription=Typora 离线注册器 安装程序
VersionInfoProductName=Typora 离线注册器
VersionInfoCompany=Seep Lab
VersionInfoCopyright=Seep Lab

[Languages]
Name: "zh"; MessagesFile: "ChineseSimplified.isl"

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"; GroupDescription: "附加任务："; Flags: unchecked

[Files]
Source: "{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\dist\使用说明.md"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\卸载 {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "立即运行 {#MyAppName}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{app}\{#MyAppExeName}"; Parameters: "--uninstall-all"; Flags: runhidden; RunOnceId: "RemoveTyporaPatches"

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
