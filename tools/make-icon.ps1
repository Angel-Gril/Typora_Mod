Add-Type -AssemblyName System.Drawing

function New-IconPng([int]$size) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  $r = [Math]::Max(2, [int]($size * 0.22))
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc(0, 0, $d, $d, 180, 90)
  $path.AddArc($size - $d, 0, $d, $d, 270, 90)
  $path.AddArc($size - $d, $size - $d, $d, $d, 0, 90)
  $path.AddArc(0, $size - $d, $d, $d, 90, 90)
  $path.CloseFigure()

  $c1 = [System.Drawing.Color]::FromArgb(255, 45, 127, 249)
  $c2 = [System.Drawing.Color]::FromArgb(255, 22, 74, 168)
  $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 90.0)
  $g.FillPath($brush, $path)

  # 白色 T
  $fontSize = [float]($size * 0.62)
  $font = New-Object System.Drawing.Font('Segoe UI', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $rectF = [System.Drawing.RectangleF]::new([single]0, [single](-1 * $size * 0.03), [single]$size, [single]$size)
  $g.DrawString('T', $font, $white, $rectF, $fmt)

  # 预览用: 256 尺寸另存 png
  if ($size -eq 256) {
    $preview = Join-Path $PSScriptRoot '..\build\gui\icon-preview.png'
    $bmp.Save($preview, [System.Drawing.Imaging.ImageFormat]::Png)
  }

  $g.Dispose()
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  return $ms.ToArray()
}

$sizes = @(16, 24, 32, 48, 64, 128, 256)
$images = @()
foreach ($s in $sizes) { $images += ,@($s, (New-IconPng $s)) }

$out = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($out)
$bw.Write([UInt16]0)            # reserved
$bw.Write([UInt16]1)            # type = icon
$bw.Write([UInt16]$sizes.Count) # count

$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $s = $images[$i][0]
  $data = $images[$i][1]
  $dim = if ($s -ge 256) { 0 } else { $s }
  $bw.Write([Byte]$dim)          # width
  $bw.Write([Byte]$dim)          # height
  $bw.Write([Byte]0)             # palette
  $bw.Write([Byte]0)             # reserved
  $bw.Write([UInt16]1)           # planes
  $bw.Write([UInt16]32)          # bpp
  $bw.Write([UInt32]$data.Length)
  $bw.Write([UInt32]$offset)
  $offset += $data.Length
}
foreach ($img in $images) { $bw.Write([byte[]]$img[1]) }
$bw.Flush()

$target = Join-Path $PSScriptRoot '..\build\gui\typora-virt.ico'
[System.IO.File]::WriteAllBytes($target, $out.ToArray())
$bw.Dispose(); $out.Dispose()
Write-Output ("icon -> " + (Resolve-Path $target) + "  " + (Get-Item $target).Length + " bytes")
