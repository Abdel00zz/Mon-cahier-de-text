# Monochrome notebook glyph, transparent background, Android 24dp at 4x.
Add-Type -AssemblyName System.Drawing
$badge = [System.Drawing.Bitmap]::new(96, 96)
$graphics = [System.Drawing.Graphics]::FromImage($badge)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$pen = [System.Drawing.Pen]::new([System.Drawing.Color]::White, 6)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.DrawRectangle($pen, 21, 15, 54, 66)
    $graphics.DrawLine($pen, 32, 17, 32, 79)
    $graphics.DrawLine($pen, 44, 34, 63, 34)
    $graphics.DrawLine($pen, 44, 48, 63, 48)
    $graphics.DrawLine($pen, 44, 62, 56, 62)
    $badge.Save((Join-Path $PSScriptRoot '../public/icons/notification-badge-96.png'), [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
    $pen.Dispose()
    $graphics.Dispose()
    $badge.Dispose()
}
