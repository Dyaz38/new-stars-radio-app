# Generate station logo variants (transparent header logo + square PWA icons)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$public = "d:\MUSIC - COMEDY\New New Stars Radio App\app\public"
$source = Join-Path $public "station-logo.png"
$brandPurple = [System.Drawing.Color]::FromArgb(255, 59, 7, 100)
$black = [System.Drawing.Color]::FromArgb(255, 0, 0, 0)

function Save-Png($bitmap, $path) {
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Make-TransparentLogo($inputPath) {
    $img = [System.Drawing.Bitmap]::FromFile($inputPath)
    $img.MakeTransparent($black)
    return $img
}

function Crop-StarMark($img) {
    $cropW = [Math]::Min([int]($img.Height * 0.88), [int]($img.Width * 0.42))
    $rect = New-Object System.Drawing.Rectangle 0, 0, $cropW, $img.Height
    return $img.Clone($rect, $img.PixelFormat)
}

function Fit-OnSquare($img, [int]$size, [float]$fillRatio) {
    $canvas = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    $g.Clear($brandPurple)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

    $maxDim = $size * $fillRatio
    $scale = [Math]::Min($maxDim / $img.Width, $maxDim / $img.Height)
    $w = [Math]::Max(1, [int]($img.Width * $scale))
    $h = [Math]::Max(1, [int]($img.Height * $scale))
    $x = [int](($size - $w) / 2)
    $y = [int](($size - $h) / 2)
    $g.DrawImage($img, $x, $y, $w, $h)
    $g.Dispose()
    return $canvas
}

# Backup source once
$backup = Join-Path $public "station-logo-source.png"
if (-not (Test-Path $backup)) {
    Copy-Item $source $backup -Force
}

$master = [System.Drawing.Bitmap]::FromFile($backup)
$transparent = Make-TransparentLogo $backup
Save-Png $transparent (Join-Path $public "station-logo.png")

$star = Crop-StarMark $transparent
$transparent.Dispose()
$master.Dispose()

@{
    "station-icon-192.png" = 192
    "station-icon-512.png" = 512
    "apple-touch-icon.png" = 180
    "favicon-32.png" = 32
    "favicon-48.png" = 48
}.GetEnumerator() | ForEach-Object {
    $icon = Fit-OnSquare $star $_.Value 0.82
    Save-Png $icon (Join-Path $public $_.Key)
    $icon.Dispose()
}

$maskable = Fit-OnSquare $star 512 0.62
Save-Png $maskable (Join-Path $public "station-icon-maskable-512.png")
$maskable.Dispose()
$star.Dispose()

Write-Output "Generated station logo assets in $public"
