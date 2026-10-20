# Minimal PE export lister (for verifying proxy DLL exports)
param([string]$Dll)
$b = [System.IO.File]::ReadAllBytes($Dll)
function U16($o) { [BitConverter]::ToUInt16($b, $o) }
function U32($o) { [BitConverter]::ToUInt32($b, $o) }
$pe = U32 0x3C
$optSize = U16 ($pe + 20)
$dirBase = $pe + 24 + 112
$expRva = U32 $dirBase
if ($expRva -eq 0) { Write-Host "NO EXPORTS"; exit }
$numSec = U16 ($pe + 6)
$secOff = $pe + 24 + $optSize
$secs = @()
for ($i = 0; $i -lt $numSec; $i++) {
  $o = $secOff + $i * 40
  $secs += [pscustomobject]@{ VA = U32 ($o + 12); Raw = U32 ($o + 20); VSize = U32 ($o + 8) }
}
function RvaToOff($rva) {
  foreach ($s in $secs) {
    if ($rva -ge $s.VA -and $rva -lt ($s.VA + [Math]::Max($s.VSize, 0x1000))) { return ($rva - $s.VA + $s.Raw) }
  }
  return -1
}
$e = RvaToOff $expRva
$nNames = U32 ($e + 24)
$namesOff = RvaToOff (U32 ($e + 32))
$out = @()
for ($i = 0; $i -lt $nNames; $i++) {
  $no = RvaToOff (U32 ($namesOff + $i * 4))
  if ($no -lt 0) { continue }
  $sb = New-Object System.Text.StringBuilder
  while ($b[$no] -ne 0) { [void]$sb.Append([char]$b[$no]); $no++ }
  $out += $sb.ToString()
}
Write-Host ("export count: " + $out.Count)
$out | Select-Object -First 12
