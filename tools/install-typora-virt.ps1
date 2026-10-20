# Typora License-State Virtualization - install / uninstall / status
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\install-typora-virt.ps1 -Action install|uninstall|status
param(
  [ValidateSet('install','uninstall','status')]
  [string]$Action = 'status',
  [string]$TyporaRoot = 'C:\AI\RD\Tool\mcp\typora-license-audit\samples\typora-app\app',
  [string]$ToolDir    = 'C:\AI\RD\Tool\mcp\typora-license-audit'
)

$ErrorActionPreference = 'Stop'
$resources  = Join-Path $TyporaRoot 'resources'
$asarPath   = Join-Path $resources 'app.asar'
$backupDir  = Join-Path $ToolDir  'patches'
$backupAsar = Join-Path $backupDir 'app.asar.orig'
$marker     = Join-Path $backupDir '.virt-installed'
$prelude    = ((Join-Path $ToolDir 'patches\virt-loader.js') -replace '\\','/')
$asarCli    = 'npx --yes @electron/asar'

function Write-Step($m) { Write-Host "[*] $m" -ForegroundColor Cyan }
function Write-Ok($m)   { Write-Host "[+] $m" -ForegroundColor Green }
function Write-Err($m)  { Write-Host "[!] $m" -ForegroundColor Red }

function Ensure-Backup {
  if (-not (Test-Path $backupAsar)) {
    Copy-Item $asarPath $backupAsar -Force
    Write-Ok ("backup created: " + $backupAsar)
  }
}

function Do-Install {
  Ensure-Backup

  # --- A. 生成旁路 asar (app.virt.asar) —— 不修改厂商原始 app.asar ---
  $tmp = Join-Path $env:TEMP ('typora-asar-' + [guid]::NewGuid().ToString('N'))
  Write-Step "extract app.asar (read-only source)"
  Invoke-Expression "$asarCli extract `"$asarPath`" `"$tmp`"" | Out-Null
  $launch = Join-Path $tmp 'launch.dist.js'
  if (-not (Test-Path $launch)) { throw "launch.dist.js not found" }

  # --- 字节级注入: 绕开 PowerShell 文本编码往返 (原文件含 U+200B) ---
  $bytes = [System.IO.File]::ReadAllBytes($launch)
  $injStr = '"use strict";require(''' + $prelude + ''');'
  $injBytes = [System.Text.Encoding]::UTF8.GetBytes($injStr)
  $ascii = [System.Text.Encoding]::ASCII.GetString($bytes)
  if ($ascii.Contains('virt-loader.js') -or $ascii.Contains('prelude.js')) {
    Write-Ok "bootstrap already present"
  } else {
    $out = New-Object byte[] ($injBytes.Length + $bytes.Length)
    [Array]::Copy($injBytes, 0, $out, 0, $injBytes.Length)
    [Array]::Copy($bytes, 0, $out, $injBytes.Length, $bytes.Length)
    [System.IO.File]::WriteAllBytes($launch, $out)
    Write-Ok "bootstrap injected (byte-level, $($injBytes.Length) bytes)"
  }

  $virtAsar = Join-Path $resources 'app.virt.asar'
  Write-Step "pack app.virt.asar (side-by-side)"
  Remove-Item $virtAsar -Force -ErrorAction SilentlyContinue
  Invoke-Expression "$asarCli pack `"$tmp`" `"$virtAsar`"" | Out-Null
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue

  # --- 指纹记录的是【原始 app.asar】, 不是旁路副本 ---
  $origBytes = [System.IO.File]::ReadAllBytes($asarPath)
  $head = ($origBytes[0..31] | ForEach-Object { $_.ToString('x2') }) -join ''
  $meta = @{ size = $origBytes.Length; head = $head; created = (Get-Date -Format o); virtSize = (Get-Item $virtAsar).Length } | ConvertTo-Json -Compress
  Set-Content (Join-Path $resources 'app.virt.meta') $meta -Encoding ASCII
  Set-Content $marker (Get-Date -Format o) -Encoding ASCII
  Write-Ok ("app.virt.asar=" + (Get-Item $virtAsar).Length + " bytes; fingerprint(original)=" + $origBytes.Length)

  # --- B. 原生代理 DLL (更新韧性/早加载钩子基座) ---
  $dllSrc = Join-Path $ToolDir 'build\winmm\target\release\winmm.dll'
  if (Test-Path $dllSrc) {
    $appDir = Split-Path $asarPath -Parent | Split-Path -Parent   # ...\app
    $t1 = Join-Path $appDir 'winmm.dll'
    $t2 = Join-Path $appDir 'winmm_real.dll'
    if (-not (Test-Path (Join-Path $backupDir 'winmm.dll.bak')) -and (Test-Path $t1) -and -not (Test-Path (Join-Path $backupDir '.virt-dll'))) {
      Copy-Item $t1 (Join-Path $backupDir 'winmm.dll.bak') -Force
    }
    Copy-Item $dllSrc $t1 -Force
    Copy-Item 'C:\Windows\System32\winmm.dll' $t2 -Force
    Set-Content (Join-Path $backupDir '.virt-dll') (Get-Date -Format o) -Encoding ASCII
    Write-Ok "proxy DLL deployed (winmm.dll + winmm_real.dll)"
  } else {
    Write-Host "[i] proxy DLL not built, skipped" -ForegroundColor Yellow
  }
}

function Do-Uninstall {
  # 移除旁路 asar / 指纹 / 代理 DLL (厂商 app.asar 从未被修改)
  $rres = Join-Path $TyporaRoot 'resources'
  foreach ($f in 'app.virt.asar','app.virt.meta') {
    $p = Join-Path $rres $f
    if (Test-Path $p) { Remove-Item $p -Force -ErrorAction SilentlyContinue }
  }
  $appDir = Split-Path $asarPath -Parent | Split-Path -Parent
  foreach ($f in 'winmm.dll','winmm_real.dll') {
    $p = Join-Path $appDir $f
    if (Test-Path $p) { Remove-Item $p -Force -ErrorAction SilentlyContinue; Write-Ok ("removed " + $f) }
  }
  $bak = Join-Path $backupDir 'winmm.dll.bak'
  if (Test-Path $bak) { Copy-Item $bak (Join-Path $appDir 'winmm.dll') -Force }
  Remove-Item (Join-Path $backupDir '.virt-dll') -Force -ErrorAction SilentlyContinue

  if (Test-Path $backupAsar) {
    Copy-Item $backupAsar $asarPath -Force
    Remove-Item $marker -Force -ErrorAction SilentlyContinue
    $sz = (Get-Item $asarPath).Length
    Write-Ok ("restored original app.asar (" + $sz + " bytes)")
  } else {
    Write-Err ("backup not found: " + $backupAsar)
  }
}

function Do-Status {
  $installed = (Test-Path $marker)
  $size = (Get-Item $asarPath).Length
  $origSize = 0
  if (Test-Path $backupAsar) { $origSize = (Get-Item $backupAsar).Length }
  Write-Host ("TyporaRoot : " + $TyporaRoot)
  Write-Host ("app.asar   : " + $size + " bytes")
  Write-Host ("backup     : " + $origSize + " bytes")
  if ($installed) { Write-Host "state      : INSTALLED (VIRT ON)" } else { Write-Host "state      : NOT INSTALLED (original)" }
  $virt = Join-Path $TyporaRoot 'resources\app.virt.asar'
  $vmeta = Join-Path $TyporaRoot 'resources\app.virt.meta'
  if (Test-Path $virt) {
    Write-Host ("side-by-side: YES (" + (Get-Item $virt).Length + " bytes)")
  } else { Write-Host "side-by-side: NO" }
  if (Test-Path $vmeta) {
    Write-Host ("fingerprint : " + ((Get-Content $vmeta -Raw).Trim()))
  } else { Write-Host "fingerprint : MISSING" }
}

switch ($Action) {
  'install'   { Do-Install }
  'uninstall' { Do-Uninstall }
  'status'    { Do-Status }
}
