Add-Type -AssemblyName System.Drawing
$srcPath = "c:\Users\UTILISATEUR Y-R.DESKTOP-GUS15N9\DTF\public\logo.png"
$pubDir = "c:\Users\UTILISATEUR Y-R.DESKTOP-GUS15N9\DTF\public"
$iconsDir = "c:\Users\UTILISATEUR Y-R.DESKTOP-GUS15N9\DTF\public\icons"

if (-not (Test-Path $pubDir)) { New-Item -ItemType Directory -Path $pubDir | Out-Null }
if (-not (Test-Path $iconsDir)) { New-Item -ItemType Directory -Path $iconsDir | Out-Null }

$img = [System.Drawing.Image]::FromFile($srcPath)

function Resize-Image ($source, $width, $height, $outputPath) {
    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($source, 0, 0, $width, $height)
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}
Resize-Image $img 192 192 "$pubDir\pwa-192x192.png"
Resize-Image $img 512 512 "$pubDir\pwa-512x512.png"
Resize-Image $img 192 192 "$iconsDir\icon-192x192.png"
Resize-Image $img 512 512 "$iconsDir\icon-512x512.png"
Resize-Image $img 1200 630 "$pubDir\og-image.png"
Resize-Image $img 64 64 "$pubDir\favicon.png"
Resize-Image $img 128 128 "$pubDir\logo-small.png"

$img.Dispose()
Write-Output "All image sizes generated successfully."
