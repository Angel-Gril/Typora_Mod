# Typora virtualization verifier: window visibility + log evidence
param(
  [string]$ToolDir = 'C:\AI\RD\Tool\mcp\typora-license-audit'
)
$ErrorActionPreference = 'SilentlyContinue'

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;
public class WinProbe {
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lp);
  [DllImport("user32.dll")] static extern int GetWindowText(IntPtr h, StringBuilder sb, int max);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  delegate bool EnumWindowsProc(IntPtr h, IntPtr lp);
  public static List<string> Get(uint t) {
    var r = new List<string>();
    EnumWindows((h, lp) => {
      uint pid; GetWindowThreadProcessId(h, out pid);
      if (pid == t) {
        var sb = new StringBuilder(300); GetWindowText(h, sb, 300);
        if (sb.Length > 0) r.Add(sb.ToString() + (IsWindowVisible(h) ? " [VISIBLE]" : " [hidden]"));
      }
      return true;
    }, IntPtr.Zero);
    return r;
  }
}
"@

$procs = Get-Process Typora -ErrorAction SilentlyContinue
$count = ($procs | Measure-Object).Count
$wins = @()
foreach ($p in $procs) { $wins += [WinProbe]::Get($p.Id) }

$logPath = Join-Path $ToolDir 'patches\virt.log'
if (-not (Test-Path $logPath)) { $logPath = Join-Path $env:LOCALAPPDATA 'TyporaVirt\virt.log' }
if (-not (Test-Path $logPath)) { $logPath = Join-Path $env:LOCALAPPDATA 'TyporaVirt\virt.log' }
$log = if (Test-Path $logPath) { Get-Content $logPath } else { @() }
$installed = ($log | Select-String 'virtualization installed').Count
$suppressed = ($log | Select-String 'auto-quit suppressed').Count
$hidden = ($log | Select-String 'startup license window').Count
$nag = ($log | Select-String 'nag snippet').Count

$hasMain = ($wins | Where-Object { $_ -match '^Typora' }).Count -gt 0
$licenseVisible = ($wins | Where-Object { $_ -match 'License Info \[VISIBLE\]' }).Count -gt 0

Write-Host ("processes      : " + $count)
Write-Host ("main window    : " + $(if ($hasMain) { 'OK' } else { 'MISSING' }))
Write-Host ("license visible: " + $(if ($licenseVisible) { 'YES (bad)' } else { 'NO (good)' }))
Write-Host ("log: installed=" + $installed + " suppressed=" + $suppressed + " hidden=" + $hidden + " nagDrop=" + $nag)

if ($count -ge 4 -and $hasMain -and -not $licenseVisible -and $installed -ge 1 -and $suppressed -ge 1) {
  Write-Host "RESULT: PASS" -ForegroundColor Green
  exit 0
} else {
  Write-Host "RESULT: FAIL" -ForegroundColor Red
  exit 1
}
