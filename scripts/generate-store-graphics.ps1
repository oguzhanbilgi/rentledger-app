Add-Type -AssemblyName System.Drawing

$graphicsDir = "D:\MobileFactory\rentledger-app\store-listing\graphics"
$assetsDir = "D:\MobileFactory\rentledger-app\assets\images"

# 1. Generate 512x512 App Icon
$rawIconPath = Join-Path $graphicsDir "ai-icon-raw.png"
if (Test-Path $rawIconPath) {
    $srcImg = [System.Drawing.Bitmap]::FromFile($rawIconPath)
    $destIcon = New-Object System.Drawing.Bitmap(512, 512, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($destIcon)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($srcImg, 0, 0, 512, 512)
    $g.Dispose()
    $srcImg.Dispose()

    $destIcon.Save((Join-Path $graphicsDir "icon-512.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $destIcon.Save((Join-Path $assetsDir "icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $destIcon.Save((Join-Path $assetsDir "android-icon-foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $destIcon.Dispose()
    Write-Host "✅ Created 512x512 icon & app assets"
}

# 2. Compose 1024x500 Feature Graphic
$rawBannerPath = Join-Path $graphicsDir "ai-feature-raw.png"
if (Test-Path $rawBannerPath) {
    $srcBanner = [System.Drawing.Bitmap]::FromFile($rawBannerPath)
    $fg = New-Object System.Drawing.Bitmap(1024, 500, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($fg)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Crop & draw background banner shifted right to give room on left
    $g.DrawImage($srcBanner, [System.Drawing.Rectangle]::FromLTRB(0, 0, 1024, 500), 100, 0, 1276, 768, [System.Drawing.GraphicsUnit]::Pixel)

    # Dark gradient overlay on left for typography readability
    $rect = New-Object System.Drawing.Rectangle(0, 0, 620, 500)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, [System.Drawing.Color]::FromArgb(240, 2, 44, 34), [System.Drawing.Color]::FromArgb(0, 2, 44, 34), [System.Drawing.Drawing2D.LinearGradientMode]::Horizontal)
    $g.FillRectangle($brush, 0, 0, 620, 500)
    $brush.Dispose()

    # Deeper left edge shadow
    $brushLeft = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(180, 6, 20, 18))
    $g.FillRectangle($brushLeft, 0, 0, 280, 500)
    $brushLeft.Dispose()

    # Fonts
    $fontBadge = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
    $fontTitle = New-Object System.Drawing.Font("Segoe UI", 36, [System.Drawing.FontStyle]::Bold)
    $fontSubtitle = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
    $fontBullet = New-Object System.Drawing.Font("Segoe UI", 13, [System.Drawing.FontStyle]::Regular)

    # Brushes
    $brushEmerald = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(52, 211, 153))
    $brushWhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $brushMuted = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(203, 213, 225))
    $brushGold = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(251, 191, 36))

    # Badge: MÜLK & KİRA TAKİBİ
    $charUmlautU = [char]0x00DC
    $charDotlessI = [char]0x0130
    $badgeText = "M" + $charUmlautU + "LK & K" + $charDotlessI + "RA Y" + [char]0x00D6 + "NET" + $charDotlessI + "M" + $charDotlessI
    $g.DrawString($badgeText, $fontBadge, $brushEmerald, 45, 55)

    # App Title
    $g.DrawString("RentLedger Pro", $fontTitle, $brushWhite, 42, 85)

    # Subtitle: Resmi PDF Kira Makbuzu
    $subText = "Resmi PDF Kira Makbuzu"
    $g.DrawString($subText, $fontSubtitle, $brushGold, 45, 160)

    # Bullets
    $bullets = @(
        ([char]0x2713 + " 15 Saniyede Tahsilat Kayd" + [char]0x0131),
        ([char]0x2713 + " Tek T" + [char]0x0131 + "kla WhatsApp Hat" + [char]0x0131 + "rlat" + [char]0x0131 + "c" + [char]0x0131),
        ([char]0x2713 + " Yasal Ge" + [char]0x00E7 + "erli A4 Kira Makbuzu"),
        ([char]0x2713 + " Ayl" + [char]0x0131 + "k Gelir ve Gecikme Takibi")
    )

    $y = 225
    foreach ($b in $bullets) {
        $g.DrawString($b, $fontBullet, $brushMuted, 45, $y)
        $y += 36
    }

    # PRO badge at bottom
    $badgeRect = New-Object System.Drawing.Rectangle(45, 410, 160, 36)
    $pillBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(16, 185, 129))
    $g.FillRectangle($pillBrush, $badgeRect)
    $pillBrush.Dispose()
    $fontPill = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
    $brushDark = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(6, 30, 20))
    $g.DrawString("OBAPPSTUDIO", $fontPill, $brushDark, 65, 417)
    $fontPill.Dispose()
    $brushDark.Dispose()

    # Clean up
    $fontBadge.Dispose()
    $fontTitle.Dispose()
    $fontSubtitle.Dispose()
    $fontBullet.Dispose()
    $brushEmerald.Dispose()
    $brushWhite.Dispose()
    $brushMuted.Dispose()
    $brushGold.Dispose()
    $g.Dispose()
    $srcBanner.Dispose()

    $destFgPath = Join-Path $graphicsDir "feature-graphic-1024x500.png"
    $fg.Save($destFgPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $fg.Dispose()
    Write-Host "✅ Created 1024x500 Feature Graphic at $destFgPath"
}
