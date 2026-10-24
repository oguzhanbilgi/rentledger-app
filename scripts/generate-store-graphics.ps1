# RentLedger Pro - Play Store grafikleri (yerel, ag erisimi yok).
#
#   powershell -ExecutionPolicy Bypass -File scripts\generate-store-graphics.ps1          # yalnizca feature graphic (EN + TR)
#   powershell -ExecutionPolicy Bypass -File scripts\generate-store-graphics.ps1 -Icon    # + ai-icon-raw.png'den ikon
#
# Feature graphic sade, metin tabanlidir ve yalnizca uygulamada GERCEKTEN olan ozellikleri yazar
# (FACTORY_RULES 1 ve 5: "resmi / yasal gecerli" iddiasi yok, altin para / parlak efekt yok).
# Bu dosya ANSI okunabildigi icin Turkce karakterler \uXXXX kacislariyla yazilir.

param([switch]$Icon)

Add-Type -AssemblyName System.Drawing

$repoRoot = Split-Path -Parent $PSScriptRoot
$graphicsDir = Join-Path $repoRoot "store-listing\graphics"
$assetsDir = Join-Path $repoRoot "assets\images"

function U([string]$text) { return [regex]::Unescape($text) }
function Rgb([int]$r, [int]$g, [int]$b, [int]$a = 255) { return [System.Drawing.Color]::FromArgb($a, $r, $g, $b) }

function New-RoundedPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    return $path
}

# --- 1. (Istege bagli) 512x512 ikon ---
if ($Icon) {
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
        Write-Host "Created 512x512 icon & app assets"
    } else {
        Write-Host "ai-icon-raw.png not found; icon skipped"
    }
}

# --- 2. 1024x500 feature graphic (EN + TR) ---
function New-FeatureGraphic([hashtable]$copy, [string]$fileName) {
    $W = 1024; $H = 500
    $bmp = New-Object System.Drawing.Bitmap($W, $H, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Arka plan: obsidian (tokens.js canvas -> surface)
    $bgRect = New-Object System.Drawing.Rectangle(0, 0, $W, $H)
    $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush($bgRect, (Rgb 7 11 20), (Rgb 14 21 38), [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
    $g.FillRectangle($bg, $bgRect)
    $bg.Dispose()

    $fontLabel = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $fontTitle = New-Object System.Drawing.Font("Segoe UI", 42, [System.Drawing.FontStyle]::Bold)
    $fontSub = New-Object System.Drawing.Font("Segoe UI", 19, [System.Drawing.FontStyle]::Regular)
    $fontBullet = New-Object System.Drawing.Font("Segoe UI", 15, [System.Drawing.FontStyle]::Regular)
    $brushAccent = New-Object System.Drawing.SolidBrush((Rgb 16 185 129))
    $brushWhite = New-Object System.Drawing.SolidBrush((Rgb 255 255 255))
    $brushMuted = New-Object System.Drawing.SolidBrush((Rgb 148 163 184))
    $brushText = New-Object System.Drawing.SolidBrush((Rgb 226 232 240))

    $g.DrawString($copy.label, $fontLabel, $brushAccent, 56, 70)
    $g.DrawString("RentLedger Pro", $fontTitle, $brushWhite, 50, 96)
    $g.DrawString($copy.subtitle, $fontSub, $brushMuted, 56, 172)
    $y = 248
    foreach ($bullet in $copy.bullets) {
        $g.FillEllipse($brushAccent, 58, $y + 9, 9, 9)
        $g.DrawString($bullet, $fontBullet, $brushText, 78, $y)
        $y += 42
    }

    # Sag: sade makbuz karti (uygulamanin gercek PDF duzenini temsil eder)
    $cardX = 640; $cardY = 56; $cardW = 320; $cardH = 388
    $cardPath = New-RoundedPath $cardX $cardY $cardW $cardH 18
    $cardBrush = New-Object System.Drawing.SolidBrush((Rgb 255 255 255))
    $g.FillPath($cardBrush, $cardPath)
    $cardBrush.Dispose(); $cardPath.Dispose()

    $fontCardTitle = New-Object System.Drawing.Font("Segoe UI", 17, [System.Drawing.FontStyle]::Bold)
    $fontMono = New-Object System.Drawing.Font("Consolas", 12, [System.Drawing.FontStyle]::Bold)
    $fontSmall = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Regular)
    $fontAmount = New-Object System.Drawing.Font("Segoe UI", 22, [System.Drawing.FontStyle]::Bold)
    $fontWords = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Italic)
    $brushInk = New-Object System.Drawing.SolidBrush((Rgb 15 23 42))
    $brushGray = New-Object System.Drawing.SolidBrush((Rgb 100 116 139))
    $brushDarkGreen = New-Object System.Drawing.SolidBrush((Rgb 4 120 87))
    $brushBar = New-Object System.Drawing.SolidBrush((Rgb 226 232 240))
    $penGreen = New-Object System.Drawing.Pen((Rgb 5 150 105), 3)
    $penLine = New-Object System.Drawing.Pen((Rgb 148 163 184), 1)

    $g.DrawString($copy.receiptTitle, $fontCardTitle, $brushInk, $cardX + 24, $cardY + 22)
    $g.DrawString("RL-2026-0001", $fontMono, $brushDarkGreen, $cardX + 26, $cardY + 56)
    $g.DrawLine($penGreen, $cardX + 24, $cardY + 84, $cardX + $cardW - 24, $cardY + 84)

    $g.DrawString($copy.tenant, $fontSmall, $brushGray, $cardX + 24, $cardY + 100)
    $g.FillRectangle($brushBar, $cardX + 24, $cardY + 124, 200, 9)
    $g.FillRectangle($brushBar, $cardX + 24, $cardY + 142, 150, 9)
    $g.DrawString($copy.period, $fontSmall, $brushGray, $cardX + 24, $cardY + 166)
    $g.FillRectangle($brushBar, $cardX + 24, $cardY + 190, 230, 9)

    $boxPath = New-RoundedPath ($cardX + 20) ($cardY + 222) ($cardW - 40) 86 10
    $boxBrush = New-Object System.Drawing.SolidBrush((Rgb 236 253 245))
    $g.FillPath($boxBrush, $boxPath)
    $boxBrush.Dispose(); $boxPath.Dispose()
    $g.DrawString($copy.amount, $fontAmount, $brushDarkGreen, $cardX + 32, $cardY + 230)
    $wordsRect = New-Object System.Drawing.RectangleF(($cardX + 34), ($cardY + 270), ($cardW - 68), 34)
    $g.DrawString($copy.words, $fontWords, $brushInk, $wordsRect)

    $g.DrawLine($penLine, $cardX + 24, $cardY + 350, $cardX + 144, $cardY + 350)
    $g.DrawLine($penLine, $cardX + $cardW - 144, $cardY + 350, $cardX + $cardW - 24, $cardY + 350)
    $g.DrawString($copy.signTenant, $fontSmall, $brushGray, $cardX + 24, $cardY + 356)
    $g.DrawString($copy.signLandlord, $fontSmall, $brushGray, $cardX + $cardW - 144, $cardY + 356)

    foreach ($d in @($fontLabel, $fontTitle, $fontSub, $fontBullet, $fontCardTitle, $fontMono, $fontSmall, $fontAmount, $fontWords,
                     $brushAccent, $brushWhite, $brushMuted, $brushText, $brushInk, $brushGray, $brushDarkGreen, $brushBar, $penGreen, $penLine)) {
        $d.Dispose()
    }
    $g.Dispose()

    $dest = Join-Path $graphicsDir $fileName
    $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created $dest"
}

$en = @{
    label = "RENT LEDGER FOR LANDLORDS"
    subtitle = "Rent tracking & PDF receipts"
    bullets = @("Record rent payments in seconds", "Share PDF rent receipts", "WhatsApp reminders for due rent")
    receiptTitle = "Rent receipt"
    tenant = "Jane Smith - Apartment 4B"
    period = "Rent for October 2026"
    amount = "`$1,200.00"
    words = "One thousand two hundred US dollars"
    signTenant = "Tenant"
    signLandlord = "Landlord"
}

$tr = @{
    label = (U "EV SAH\u0130PLER\u0130 \u0130\u00C7\u0130N K\u0130RA DEFTER\u0130")
    subtitle = (U "Kira takibi ve PDF makbuz")
    bullets = @(
        (U "Kira tahsilat\u0131n\u0131 saniyeler i\u00E7inde kaydedin"),
        (U "PDF kira makbuzu payla\u015F\u0131n"),
        (U "Vadesi gelen kira i\u00E7in WhatsApp hat\u0131rlatma")
    )
    receiptTitle = "Kira makbuzu"
    tenant = (U "Ahmet Y\u0131lmaz - Kad\u0131k\u00F6y Daire 4")
    period = (U "Ekim 2026 d\u00F6nemi kira bedeli")
    amount = (U "\u20BA25.000,00")
    words = (U "Yirmi be\u015F bin T\u00FCrk liras\u0131")
    signTenant = (U "Kirac\u0131")
    signLandlord = "Ev sahibi"
}

New-FeatureGraphic $en "feature-graphic-1024x500.png"
New-FeatureGraphic $tr "feature-graphic-1024x500-tr.png"
