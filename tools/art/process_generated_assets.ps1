param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$generatedRoot = 'C:\Users\YYQ\.codex\generated_images\01a0ba21-8b59-7ef0-b11d-9681bc9671d3'

$sourceRoot = Join-Path $workspaceRoot 'art-source\generated'
$runtimeRoot = Join-Path $workspaceRoot 'assets\art'

$directories = @(
    $sourceRoot,
    (Join-Path $sourceRoot 'characters'),
    (Join-Path $sourceRoot 'obstacles'),
    (Join-Path $sourceRoot 'backgrounds'),
    (Join-Path $sourceRoot 'ui'),
    (Join-Path $sourceRoot 'effects'),
    (Join-Path $sourceRoot 'branding'),
    (Join-Path $runtimeRoot 'characters\nezha'),
    (Join-Path $runtimeRoot 'obstacles\ground'),
    (Join-Path $runtimeRoot 'obstacles\sky'),
    (Join-Path $runtimeRoot 'backgrounds\day'),
    (Join-Path $runtimeRoot 'ui\common'),
    (Join-Path $runtimeRoot 'effects'),
    (Join-Path $runtimeRoot 'branding')
)

foreach ($directory in $directories) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
}

function Assert-CanWrite {
    param([string]$Path)

    if ((Test-Path -LiteralPath $Path) -and -not $Force) {
        throw "Target already exists: $Path. Re-run with -Force only when replacement is intentional."
    }
}

function Copy-SourceAsset {
    param(
        [string]$GeneratedName,
        [string]$RelativeDestination
    )

    $source = Join-Path $generatedRoot $GeneratedName
    $destination = Join-Path $sourceRoot $RelativeDestination
    if (-not (Test-Path -LiteralPath $source)) {
        throw "Generated source not found: $source"
    }
    Assert-CanWrite $destination
    Copy-Item -LiteralPath $source -Destination $destination
    return $destination
}

function Get-AlphaBounds {
    param(
        [System.Drawing.Bitmap]$Bitmap,
        [int]$Threshold = 4,
        [int]$Padding = 8
    )

    $minX = $Bitmap.Width
    $minY = $Bitmap.Height
    $maxX = -1
    $maxY = -1

    for ($y = 0; $y -lt $Bitmap.Height; $y++) {
        for ($x = 0; $x -lt $Bitmap.Width; $x++) {
            if ($Bitmap.GetPixel($x, $y).A -gt $Threshold) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }

    if ($maxX -lt $minX -or $maxY -lt $minY) {
        throw 'No visible pixels found while trimming image.'
    }

    $left = [Math]::Max(0, $minX - $Padding)
    $top = [Math]::Max(0, $minY - $Padding)
    $right = [Math]::Min($Bitmap.Width - 1, $maxX + $Padding)
    $bottom = [Math]::Min($Bitmap.Height - 1, $maxY + $Padding)
    return [System.Drawing.Rectangle]::new($left, $top, $right - $left + 1, $bottom - $top + 1)
}

function Save-CroppedCell {
    param(
        [System.Drawing.Bitmap]$Source,
        [System.Drawing.Rectangle]$Cell,
        [string]$Destination,
        [int]$AlphaThreshold = 4,
        [int]$Padding = 8
    )

    Assert-CanWrite $Destination
    $cellBitmap = New-Object System.Drawing.Bitmap $Cell.Width, $Cell.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($cellBitmap)
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.DrawImage($Source, [System.Drawing.Rectangle]::new(0, 0, $Cell.Width, $Cell.Height), $Cell, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.Dispose()

    $bounds = Get-AlphaBounds -Bitmap $cellBitmap -Threshold $AlphaThreshold -Padding $Padding
    $trimmed = $cellBitmap.Clone($bounds, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $trimmed.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
    $trimmed.Dispose()
    $cellBitmap.Dispose()
}

function Split-Grid {
    param(
        [string]$SourcePath,
        [int]$Columns,
        [int]$Rows,
        [string[]]$Destinations,
        [int]$AlphaThreshold = 4,
        [int]$Padding = 8
    )

    if ($Destinations.Count -ne ($Columns * $Rows)) {
        throw 'Destination count does not match grid cell count.'
    }

    $bitmap = [System.Drawing.Bitmap]::FromFile($SourcePath)
    try {
        for ($row = 0; $row -lt $Rows; $row++) {
            for ($column = 0; $column -lt $Columns; $column++) {
                $index = ($row * $Columns) + $column
                $x0 = [Math]::Floor(($column * $bitmap.Width) / $Columns)
                $x1 = [Math]::Floor((($column + 1) * $bitmap.Width) / $Columns)
                $y0 = [Math]::Floor(($row * $bitmap.Height) / $Rows)
                $y1 = [Math]::Floor((($row + 1) * $bitmap.Height) / $Rows)
                $cell = [System.Drawing.Rectangle]::new($x0, $y0, $x1 - $x0, $y1 - $y0)
                Save-CroppedCell -Source $bitmap -Cell $cell -Destination $Destinations[$index] -AlphaThreshold $AlphaThreshold -Padding $Padding
            }
        }
    }
    finally {
        $bitmap.Dispose()
    }
}

function Resize-Png {
    param(
        [string]$SourcePath,
        [string]$Destination,
        [int]$Width,
        [int]$Height
    )

    Assert-CanWrite $Destination
    $source = [System.Drawing.Bitmap]::FromFile($SourcePath)
    try {
        $target = New-Object System.Drawing.Bitmap $Width, $Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $graphics = [System.Drawing.Graphics]::FromImage($target)
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($source, 0, 0, $Width, $Height)
        $graphics.Dispose()
        $target.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
        $target.Dispose()
    }
    finally {
        $source.Dispose()
    }
}

function Trim-Png {
    param(
        [string]$SourcePath,
        [string]$Destination,
        [int]$MaxWidth = 0
    )

    Assert-CanWrite $Destination
    $source = [System.Drawing.Bitmap]::FromFile($SourcePath)
    try {
        $bounds = Get-AlphaBounds -Bitmap $source -Threshold 4 -Padding 8
        $trimmed = $source.Clone($bounds, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        if ($MaxWidth -gt 0 -and $trimmed.Width -gt $MaxWidth) {
            $height = [Math]::Round($trimmed.Height * ($MaxWidth / $trimmed.Width))
            $target = New-Object System.Drawing.Bitmap $MaxWidth, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
            $graphics = [System.Drawing.Graphics]::FromImage($target)
            $graphics.Clear([System.Drawing.Color]::Transparent)
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.DrawImage($trimmed, 0, 0, $MaxWidth, $height)
            $graphics.Dispose()
            $target.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
            $target.Dispose()
        }
        else {
            $trimmed.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
        }
        $trimmed.Dispose()
    }
    finally {
        $source.Dispose()
    }
}

$characterSheet = Copy-SourceAsset 'exec-db474813-9e34-4d61-ba45-cfa64affc51b.png' 'characters\nezha_pose_sheet.png'
$wheelSheet = Copy-SourceAsset 'exec-f04478d4-bf30-41d7-91f4-61910673a807.png' 'characters\wind_fire_wheel_sheet.png'
$groundSheet = Copy-SourceAsset 'exec-de9375d2-dbac-4f0b-84ce-7c4e999751e1.png' 'obstacles\ground_obstacle_sheet.png'
$skyObstacleSheet = Copy-SourceAsset 'exec-e4653c6b-b455-4491-b1f3-148606af4e41.png' 'obstacles\sky_obstacle_sheet.png'
$skyBaseSource = Copy-SourceAsset 'exec-5e6cdf98-a3a1-4272-adea-0ce5b87a7fc0.png' 'backgrounds\bg_00_sky_source.png'
$cloudSource = Copy-SourceAsset 'exec-5c77ee7a-4a41-4f11-a779-cf8d9c220147.png' 'backgrounds\bg_01_clouds_source.png'
$landscapeSource = Copy-SourceAsset 'exec-7616ea6f-2700-4b02-a9c0-2d2d57aeb484.png' 'backgrounds\bg_02_landscape_source.png'
$citySource = Copy-SourceAsset 'exec-5b2a6787-12ac-4b6c-b31d-02e68f3624c6.png' 'backgrounds\bg_03_chentang_pass_source.png'
$foregroundSource = Copy-SourceAsset 'exec-0e008252-39aa-4f57-b9af-4cca10af238d.png' 'backgrounds\bg_04_foreground_source.png'
$uiSheet = Copy-SourceAsset 'exec-4f4388ce-0e5b-4bbe-af67-9ab779fb338d.png' 'ui\ui_component_sheet.png'
$effectsSheet = Copy-SourceAsset 'exec-b9311622-2f7d-48cb-aac0-83e7dec63baa.png' 'effects\effects_sheet.png'
$titleSource = Copy-SourceAsset 'exec-0aed0457-6603-476b-90f0-fbbdabeb10e3.png' 'branding\title_logo_source.png'
$iconSource = Copy-SourceAsset 'exec-7fe9d529-1bc5-4cb1-a9a1-cc1380210af7.png' 'branding\app_icon_source.png'

Split-Grid -SourcePath $characterSheet -Columns 3 -Rows 2 -Destinations @(
    (Join-Path $runtimeRoot 'characters\nezha\nezha_idle.png'),
    (Join-Path $runtimeRoot 'characters\nezha\nezha_boost.png'),
    (Join-Path $runtimeRoot 'characters\nezha\nezha_fall.png'),
    (Join-Path $runtimeRoot 'characters\nezha\nezha_hit.png'),
    (Join-Path $runtimeRoot 'characters\nezha\nezha_result.png'),
    (Join-Path $runtimeRoot 'characters\nezha\nezha_reference.png')
)

Split-Grid -SourcePath $wheelSheet -Columns 3 -Rows 1 -Destinations @(
    (Join-Path $runtimeRoot 'characters\nezha\wind_fire_wheel_normal.png'),
    (Join-Path $runtimeRoot 'characters\nezha\wind_fire_wheel_boost.png'),
    (Join-Path $runtimeRoot 'characters\nezha\wind_fire_wheel_weak.png')
)

Split-Grid -SourcePath $groundSheet -Columns 3 -Rows 1 -Destinations @(
    (Join-Path $runtimeRoot 'obstacles\ground\obstacle_mountain.png'),
    (Join-Path $runtimeRoot 'obstacles\ground\obstacle_stone_pillar.png'),
    (Join-Path $runtimeRoot 'obstacles\ground\obstacle_fireball.png')
)

Split-Grid -SourcePath $skyObstacleSheet -Columns 3 -Rows 1 -Destinations @(
    (Join-Path $runtimeRoot 'obstacles\sky\obstacle_storm_cloud.png'),
    (Join-Path $runtimeRoot 'obstacles\sky\obstacle_lightning.png'),
    (Join-Path $runtimeRoot 'obstacles\sky\obstacle_bagua.png')
)

Resize-Png -SourcePath $skyBaseSource -Destination (Join-Path $runtimeRoot 'backgrounds\day\bg_00_sky.png') -Width 750 -Height 1334
Resize-Png -SourcePath $cloudSource -Destination (Join-Path $runtimeRoot 'backgrounds\day\bg_01_clouds.png') -Width 750 -Height 1334
Resize-Png -SourcePath $landscapeSource -Destination (Join-Path $runtimeRoot 'backgrounds\day\bg_02_landscape.png') -Width 750 -Height 1334
Resize-Png -SourcePath $citySource -Destination (Join-Path $runtimeRoot 'backgrounds\day\bg_03_chentang_pass.png') -Width 750 -Height 1334
Resize-Png -SourcePath $foregroundSource -Destination (Join-Path $runtimeRoot 'backgrounds\day\bg_04_foreground.png') -Width 750 -Height 1334

Split-Grid -SourcePath $uiSheet -Columns 3 -Rows 2 -AlphaThreshold 12 -Padding 6 -Destinations @(
    (Join-Path $runtimeRoot 'ui\common\ui_button_primary.png'),
    (Join-Path $runtimeRoot 'ui\common\ui_panel_result.png'),
    (Join-Path $runtimeRoot 'ui\common\ui_button_round.png'),
    (Join-Path $runtimeRoot 'ui\common\ui_score_plaque.png'),
    (Join-Path $runtimeRoot 'ui\common\ui_badge_new_record.png'),
    (Join-Path $runtimeRoot 'ui\common\ui_divider_cloud.png')
)

Split-Grid -SourcePath $effectsSheet -Columns 2 -Rows 2 -Destinations @(
    (Join-Path $runtimeRoot 'effects\fx_score_sparkle.png'),
    (Join-Path $runtimeRoot 'effects\fx_collision_puff.png'),
    (Join-Path $runtimeRoot 'effects\fx_fire_sparks.png'),
    (Join-Path $runtimeRoot 'effects\fx_drifting_leaves.png')
)

Trim-Png -SourcePath $titleSource -Destination (Join-Path $runtimeRoot 'branding\title_nezha_cannot_fly.png') -MaxWidth 1536
Resize-Png -SourcePath $iconSource -Destination (Join-Path $runtimeRoot 'branding\app_icon_1024.png') -Width 1024 -Height 1024

Write-Host 'Art assets processed successfully.'

