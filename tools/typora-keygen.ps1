# Typora Offline Registration Keygen (ASCII only - PS 5.1 safe)
# Algorithm is identical to patches/registration.js (FNV-1a/32 + base32 alphabet)
param(
  [string]$Machine,
  [string]$Guid,
  [string]$VerifyCode,
  [switch]$WriteState,
  [switch]$Json
)

$ErrorActionPreference = 'Stop'
$ALPHABET = 'L23456789ABCDEFGHJKMNPQRSTUVWXYZ'
$SALT = 'typora-virt-v1'
$STATE_DIR = Join-Path $env:APPDATA 'Typora'
$STATE_FILE = Join-Path $STATE_DIR 'virt-reg.json'

function FNV1a([string]$s, [uint64]$seed) {
  [uint64]$h = $seed
  foreach ($ch in $s.ToCharArray()) {
    $h = $h -bxor [uint64][int][char]$ch
    $h = ($h * 16777619) % 4294967296
  }
  return [uint32]$h
}

function Get-MachineCode([string]$guid) {
  $g = $guid.ToUpper()
  $h1 = FNV1a "m1|$g" 2166136261
  $h2 = FNV1a "m2|$g" 2166136261
  $bits = ''
  foreach ($h in @($h1, $h2)) {
    [uint64]$v = $h
    for ($i = 0; $i -lt 8; $i++) {
      $bits += $ALPHABET[[int]($v % 32)]
      $v = [math]::Floor($v / 32)
    }
  }
  return 'VT-' + $bits.Substring(0,4) + '-' + $bits.Substring(4,4) + '-' + $bits.Substring(8,4) + '-' + $bits.Substring(12,4)
}

function Get-CodeFor([string]$machine) {
  $m = $machine.ToUpper()
  $out = ''
  for ($b = 0; $b -lt 4; $b++) {
    for ($i = 0; $i -lt 6; $i++) {
      $h = FNV1a "$SALT|$m|$b|$i" 2166136261
      $out += $ALPHABET[[int]($h % 32)]
    }
    if ($b -lt 3) { $out += '-' }
  }
  return $out
}

function Get-MachineGuid {
  try {
    $out = & reg query "HKLM\SOFTWARE\Microsoft\Cryptography" /v MachineGuid 2>$null
    $line = $out | Where-Object { $_ -match 'MachineGuid' } | Select-Object -First 1
    if ($line -match 'REG_SZ\s+(\S+)') { return $Matches[1] }
  } catch {}
  return $env:COMPUTERNAME
}

if ($Guid) { $mcGuid = $Guid } else { $mcGuid = Get-MachineGuid }

if ($Machine) { $mc = $Machine.ToUpper() } else { $mc = Get-MachineCode $mcGuid }
$code = Get-CodeFor $mc

if ($VerifyCode) {
  $norm = ($VerifyCode -replace '\s','').ToUpper()
  $ok = ($norm -eq $code)
  if ($Json) {
    @{ machine = $mc; expected = $code; given = $norm; valid = $ok } | ConvertTo-Json -Compress
  } else {
    Write-Host ("machine  : " + $mc)
    Write-Host ("given    : " + $norm)
    Write-Host ("expected : " + $code)
    if ($ok) { Write-Host "RESULT: VALID" -ForegroundColor Green } else { Write-Host "RESULT: INVALID" -ForegroundColor Red }
  }
  if (-not $ok) { exit 1 } else { exit 0 }
}

if ($WriteState) {
  if (-not (Test-Path $STATE_DIR)) { New-Item -ItemType Directory -Force -Path $STATE_DIR | Out-Null }
  $stateObj = [ordered]@{
    machine = $mc
    email   = 'user@local'
    code    = $code
    issued  = (Get-Date).ToString('o')
    source  = 'keygen-cli'
  }
  $jsonText = $stateObj | ConvertTo-Json
  [System.IO.File]::WriteAllText($STATE_FILE, $jsonText, (New-Object System.Text.UTF8Encoding($false)))
}

if ($Json) {
  @{ machine = $mc; code = $code; guid = $mcGuid; stateFile = $STATE_FILE; written = [bool]$WriteState } | ConvertTo-Json -Compress
} else {
  Write-Host ""
  Write-Host  "  Typora Offline Registration Keygen" -ForegroundColor Cyan
  Write-Host  "  ---------------------------------------------"
  Write-Host ("  MachineGuid : " + $mcGuid)
  Write-Host ("  MachineCode : " + $mc) -ForegroundColor Yellow
  Write-Host ("  RegCode     : " + $code) -ForegroundColor Green
  if ($WriteState) { Write-Host ("  State       : " + $STATE_FILE) -ForegroundColor DarkGray }
  Write-Host ""
  Write-Host  "  Paste RegCode into Typora: Help -> My License" -ForegroundColor DarkGray
  Write-Host ""
}
