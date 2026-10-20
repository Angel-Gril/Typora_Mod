# Parse PE export names from a DLL -> emit .def forwarder file
param(
  [string]$Dll = 'C:\Windows\System32\winmm.dll',
  [string]$Target = 'winmm_real',
  [string]$OutDef = 'C:\AI\RD\Tool\mcp\typora-license-audit\build\winmm\winmm.def'
)
$ErrorActionPreference = 'Stop'
$b = [System.IO.File]::ReadAllBytes($Dll)

function U16($o) { [BitConverter]::ToUInt16($b, $o) }
function U32($o) { [BitConverter]::ToUInt32($b, $o) }

$pe = U32 0x3C
$magic = U16 ($pe + 24)
$is64 = ($magic -eq 0x20B)
$optSize = U16 ($pe + 20)
$numDirs = U32 ($pe + 24 + 108)
$dirBase = $pe + 24 + 112
$expRva = U32 ($dirBase + 0)
$expSize = U32 ($dirBase + 4)
if ($expRva -eq 0) { throw "no export directory" }

# section table
$numSec = U16 ($pe + 6)
$secOff = $pe + 24 + $optSize
$sections = @()
for ($i = 0; $i -lt $numSec; $i++) {
  $o = $secOff + $i * 40
  $sections += [pscustomobject]@{
    VA   = U32 ($o + 12)
    Raw  = U32 ($o + 20)
    VSize= U32 ($o + 8)
  }
}
function RvaToOff($rva) {
  foreach ($s in $sections) {
    if ($rva -ge $s.VA -and $rva -lt ($s.VA + [Math]::Max($s.VSize, 0x1000))) {
      return ($rva - $s.VA + $s.Raw)
    }
  }
  return -1
}

$expOff = RvaToOff $expRva
$nNames = U32 ($expOff + 24)
$namesRva = U32 ($expOff + 32)
$namesOff = RvaToOff $namesRva

$names = New-Object System.Collections.Generic.List[string]
for ($i = 0; $i -lt $nNames; $i++) {
  $nameRva = U32 ($namesOff + $i * 4)
  $nameOff = RvaToOff $nameRva
  if ($nameOff -lt 0) { continue }
  $sb = New-Object System.Text.StringBuilder
  while ($b[$nameOff] -ne 0) { [void]$sb.Append([char]$b[$nameOff]); $nameOff++ }
  $n = $sb.ToString()
  if ($n) { $names.Add($n) }
}

Write-Host ("exports found: " + $names.Count)
$dir = Split-Path $OutDef -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add('LIBRARY winmm')
$lines.Add('EXPORTS')
foreach ($n in $names) { $lines.Add("  $n=$Target.$n") }
[System.IO.File]::WriteAllLines($OutDef, $lines.ToArray(), (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("def written: " + $OutDef + " (" + $names.Count + " forwarders)")
