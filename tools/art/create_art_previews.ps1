$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$artRoot = Join-Path $workspaceRoot 'assets\art'
$previewRoot = Join-Path $workspaceRoot 'docs\previews'
New-Item -ItemType Directory -Path $previewRoot -Force | Out-Null

function Draw-ImageFile {
    param(
        [System.Drawing.Graphics]$Graphics,
        [string]$Path,
        [System.Drawing.Rectangle]$Rectangle
    )

    $image = [System.Drawing.Image]::FromFile($Path)
    try {
        $Graphics.DrawImage($image, $Rectangle)
    }
    finally {
        $image.Dispose()
    }
}

function New-Canvas {
    $bitmap = New-Object System.Drawing.Bitmap 750, 1334, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    return @($bitmap, $graphics)
}

function Draw-Background {
    param([System.Drawing.Graphics]$Graphics)

    $full = [System.Drawing.Rectangle]::new(0, 0, 750, 1334)
    Draw-ImageFile $Graphics (Join-Path $artRoot 'backgrounds\day\bg_00_sky.png') $full
    Draw-ImageFile $Graphics (Join-Path $artRoot 'backgrounds\day\bg_01_clouds.png') $full
    Draw-ImageFile $Graphics (Join-Path $artRoot 'backgrounds\day\bg_02_landscape.png') $full
    Draw-ImageFile $Graphics (Join-Path $artRoot 'backgrounds\day\bg_03_chentang_pass.png') $full
}

$gameplay = New-Canvas
$gameplayBitmap = $gameplay[0]
$gameplayGraphics = $gameplay[1]
Draw-Background $gameplayGraphics
Draw-ImageFile $gameplayGraphics (Join-Path $artRoot 'obstacles\sky\obstacle_lightning.png') ([System.Drawing.Rectangle]::new(500, -25, 270, 257))
Draw-ImageFile $gameplayGraphics (Join-Path $artRoot 'obstacles\ground\obstacle_mountain.png') ([System.Drawing.Rectangle]::new(500, 985, 250, 322))
Draw-ImageFile $gameplayGraphics (Join-Path $artRoot 'characters\nezha\wind_fire_wheel_normal.png') ([System.Drawing.Rectangle]::new(154, 695, 86, 76))
Draw-ImageFile $gameplayGraphics (Join-Path $artRoot 'characters\nezha\wind_fire_wheel_normal.png') ([System.Drawing.Rectangle]::new(220, 712, 86, 76))
Draw-ImageFile $gameplayGraphics (Join-Path $artRoot 'characters\nezha\nezha_idle.png') ([System.Drawing.Rectangle]::new(110, 450, 210, 289))
Draw-ImageFile $gameplayGraphics (Join-Path $artRoot 'backgrounds\day\bg_04_foreground.png') ([System.Drawing.Rectangle]::new(0, 0, 750, 1334))

$scoreFont = New-Object System.Drawing.Font 'Microsoft YaHei UI', 42, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$scoreShadow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(150, 48, 40, 38))
$scoreBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 248, 239, 216))
$gameplayGraphics.DrawString('12', $scoreFont, $scoreShadow, 350, 54)
$gameplayGraphics.DrawString('12', $scoreFont, $scoreBrush, 346, 50)
$scoreFont.Dispose()
$scoreShadow.Dispose()
$scoreBrush.Dispose()
$gameplayGraphics.Dispose()
$gameplayPath = Join-Path $previewRoot 'v1_gameplay_art_preview.png'
$gameplayBitmap.Save($gameplayPath, [System.Drawing.Imaging.ImageFormat]::Png)
$gameplayBitmap.Dispose()

$homeCanvas = New-Canvas
$homeBitmap = $homeCanvas[0]
$homeGraphics = $homeCanvas[1]
Draw-Background $homeGraphics
Draw-ImageFile $homeGraphics (Join-Path $artRoot 'branding\title_nezha_cannot_fly.png') ([System.Drawing.Rectangle]::new(55, 95, 640, 181))
Draw-ImageFile $homeGraphics (Join-Path $artRoot 'characters\nezha\wind_fire_wheel_normal.png') ([System.Drawing.Rectangle]::new(270, 748, 120, 106))
Draw-ImageFile $homeGraphics (Join-Path $artRoot 'characters\nezha\wind_fire_wheel_normal.png') ([System.Drawing.Rectangle]::new(365, 764, 120, 106))
Draw-ImageFile $homeGraphics (Join-Path $artRoot 'characters\nezha\nezha_idle.png') ([System.Drawing.Rectangle]::new(210, 390, 330, 455))
Draw-ImageFile $homeGraphics (Join-Path $artRoot 'ui\common\ui_button_primary.png') ([System.Drawing.Rectangle]::new(185, 980, 380, 245))
Draw-ImageFile $homeGraphics (Join-Path $artRoot 'backgrounds\day\bg_04_foreground.png') ([System.Drawing.Rectangle]::new(0, 0, 750, 1334))

$buttonFont = New-Object System.Drawing.Font 'Microsoft YaHei UI', 42, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$buttonBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 48, 40, 38))
$homeGraphics.DrawString('点击起飞', $buttonFont, $buttonBrush, 289, 1063)
$buttonFont.Dispose()
$buttonBrush.Dispose()
$homeGraphics.Dispose()
$homePath = Join-Path $previewRoot 'v1_home_art_preview.png'
$homeBitmap.Save($homePath, [System.Drawing.Imaging.ImageFormat]::Png)
$homeBitmap.Dispose()

Write-Host "Created $gameplayPath"
Write-Host "Created $homePath"
