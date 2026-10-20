Add-Type -AssemblyName System.Drawing

function New-Badge {
  param(
    [string]$Path,
    [string]$Left = 'LINUX DO',
    [string]$Right = '新的理想型社区',
    [int]$Height = 36
  )
  $font = New-Object System.Drawing.Font('Segoe UI', 13, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $fontR = New-Object System.Drawing.Font('Microsoft YaHei UI', 12, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $bmpTmp = New-Object System.Drawing.Bitmap(1, 1)
  $gTmp = [System.Drawing.Graphics]::FromImage($bmpTmp)
  $wL = [int]$gTmp.MeasureString($Left, $font).Width
  $wR = [int]$gTmp.MeasureString($Right, $fontR).Width
  $gTmp.Dispose(); $bmpTmp.Dispose()

  $padL = 14; $padR = 14; $gap = 10
  $w = $padL + $wL + $gap + $wR + $padR
  $bmp = New-Object System.Drawing.Bitmap($w, $Height)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  $g.Clear([System.Drawing.Color]::Transparent)

  $r = 8
  $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $gp.AddArc(0, 0, $d, $d, 180, 90)
  $gp.AddArc($w - $d - 1, 0, $d, $d, 270, 90)
  $gp.AddArc($w - $d - 1, $Height - $d - 1, $d, $d, 0, 90)
  $gp.AddArc(0, $Height - $d - 1, $d, $d, 90, 90)
  $gp.CloseFigure()

  $bg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 23, 42))
  $g.FillPath($bg, $gp)
  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 56, 189, 248), 2)
  $g.DrawPath($pen, $gp)

  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $cyan = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 125, 211, 252))
  $g.DrawString($Left, $font, $white, [single]$padL, [single](($Height - 18) / 2 - 1))
  $g.DrawString($Right, $fontR, $cyan, [single]($padL + $wL + $gap), [single](($Height - 16) / 2))
  $g.Dispose()

  $dir = Split-Path $Path -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output ("badge -> $Path  (" + (Get-Item $Path).Length + " bytes)")
}

New-Badge -Path (Join-Path $PSScriptRoot '..\docs\images\linuxdo.png')
