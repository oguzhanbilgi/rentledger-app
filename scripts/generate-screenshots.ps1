Add-Type -AssemblyName System.Drawing

$graphicsDir = "D:\MobileFactory\rentledger-app\store-listing\graphics"
$W = 1080
$H = 2160

function Create-Screenshot {
    param(
        [string]$Filename,
        [string]$Category,
        [string]$Headline,
        [string]$Subline,
        [scriptblock]$DrawContent
    )

    $bmp = New-Object System.Drawing.Bitmap($W, $H, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Background Gradient (Deep emerald dark #041f17 to #090f1d)
    $bgRect = New-Object System.Drawing.Rectangle(0, 0, $W, $H)
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($bgRect, [System.Drawing.Color]::FromArgb(4, 31, 23), [System.Drawing.Color]::FromArgb(9, 15, 29), [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
    $g.FillRectangle($bgBrush, $bgRect)
    $bgBrush.Dispose()

    # Ambient Glow Sphere top center
    $glowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(35, 16, 185, 129))
    $g.FillEllipse($glowBrush, 140, -100, 800, 400)
    $glowBrush.Dispose()

    # Fonts
    $fontCat = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
    $fontHead = New-Object System.Drawing.Font("Segoe UI", 44, [System.Drawing.FontStyle]::Bold)
    $fontSub = New-Object System.Drawing.Font("Segoe UI", 24, [System.Drawing.FontStyle]::Regular)

    $brushEmerald = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(52, 211, 153))
    $brushWhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $brushMuted = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(203, 213, 225))

    # Header texts
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center

    $g.DrawString($Category, $fontCat, $brushEmerald, ($W / 2), 120, $sf)
    $g.DrawString($Headline, $fontHead, $brushWhite, ($W / 2), 165, $sf)
    $g.DrawString($Subline, $fontSub, $brushMuted, ($W / 2), 245, $sf)

    # Phone Frame Container (X: 70, Y: 330, W: 940, H: 1750)
    $phoneX = 70
    $phoneY = 330
    $phoneW = 940
    $phoneH = 1750

    # Phone Outer Shadow / Glow
    $phoneShadow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(120, 2, 10, 8))
    $g.FillRectangle($phoneShadow, ($phoneX - 10), ($phoneY - 10), ($phoneW + 20), ($phoneH + 20))
    $phoneShadow.Dispose()

    # Phone Body (Deep dark slate #0b1120)
    $phoneBody = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(11, 17, 32))
    $g.FillRectangle($phoneBody, $phoneX, $phoneY, $phoneW, $phoneH)
    $phoneBody.Dispose()

    # Phone Inner Border (Emerald sheen)
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(45, 52, 211, 153), 3)
    $g.DrawRectangle($borderPen, $phoneX, $phoneY, $phoneW, $phoneH)
    $borderPen.Dispose()

    # Dynamic Phone Screen Content
    & $DrawContent $g $phoneX $phoneY $phoneW $phoneH

    # Clean up
    $fontCat.Dispose()
    $fontHead.Dispose()
    $fontSub.Dispose()
    $brushEmerald.Dispose()
    $brushWhite.Dispose()
    $brushMuted.Dispose()
    $sf.Dispose()
    $g.Dispose()

    $destPath = Join-Path $graphicsDir $Filename
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "✅ Created $Filename"
}

# --- SCREENSHOT 1: DASHBOARD ---
Create-Screenshot -Filename "screenshot-1.png" `
    -Category ("M" + [char]0x00DC + "LK & K" + [char]0x0130 + "RA TAK" + [char]0x0130 + "B" + [char]0x0130) `
    -Headline ("Ayl" + [char]0x0131 + "k Gelir ve Tahsilat") `
    -Subline ("T" + [char]0x00FC + "m kirac" + [char]0x0131 + "lar" + [char]0x0131 + "n" + [char]0x0131 + "z tek bir ekranda cebinizde") `
    -DrawContent {
        param($g, $px, $py, $pw, $ph)

        $fontCardTitle = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
        $fontBigNum = New-Object System.Drawing.Font("Segoe UI", 36, [System.Drawing.FontStyle]::Bold)
        $fontSmall = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Regular)
        $fontSmallBold = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)

        $cardBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(19, 29, 48))
        $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        $greenBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(52, 211, 153))
        $mutedBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(148, 163, 184))
        $redBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(248, 113, 113))

        # Financial Summary Card
        $g.FillRectangle($cardBrush, ($px + 40), ($py + 60), ($pw - 80), 280)
        $g.DrawString("EK" + [char]0x0130 + "M 2026 K" + [char]0x0130 + "RA GEL" + [char]0x0130 + "R" + [char]0x0130, $fontCardTitle, $greenBrush, ($px + 70), ($py + 90))
        $g.DrawString("₺ 48.500", $fontBigNum, $whiteBrush, ($px + 70), ($py + 125))

        # Progress bar
        $progBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 41, 59))
        $g.FillRectangle($progBg, ($px + 70), ($py + 210), ($pw - 140), 16)
        $progBg.Dispose()
        $progFill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(16, 185, 129))
        $g.FillRectangle($progFill, ($px + 70), ($py + 210), [int](($pw - 140) * 0.85), 16)
        $progFill.Dispose()

        $g.DrawString("Tahsil Edilen: ₺ 41.000 (%85)", $fontSmall, $mutedBrush, ($px + 70), ($py + 245))

        # Overdue Alert Banner
        $alertBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(50, 239, 68, 68))
        $g.FillRectangle($alertBrush, ($px + 40), ($py + 370), ($pw - 80), 120)
        $alertBrush.Dispose()
        $alertBorder = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(239, 68, 68), 2)
        $g.DrawRectangle($alertBorder, ($px + 40), ($py + 370), ($pw - 80), 120)
        $alertBorder.Dispose()

        $g.DrawString([char]0x26A0 + " 1 Geciken Kira: Ahmet Y" + [char]0x0131 + "lmaz", $fontSmallBold, $redBrush, ($px + 70), ($py + 395))
        $g.DrawString("Daire 4 • ₺ 7.500 (3 G" + [char]0x00FC + "n Gecikti)", $fontSmall, $whiteBrush, ($px + 70), ($py + 430))

        # Tenant Cards
        $tenants = @(
            @{ Name = "Mehmet Demir"; Unit = "Kad" + [char]0x0131 + "k" + [char]0x00F6 + "y Daire 2"; Amount = "₺ 18.000"; Status = ([char]0x2713 + " Tahsil Edildi"); Color = $greenBrush },
            @{ Name = "Ay" + [char]0x015F + "e Kaya"; Unit = "Be" + [char]0x015F + "ikta" + [char]0x015F + " Ofis 5"; Amount = "₺ 23.000"; Status = ([char]0x2713 + " Tahsil Edildi"); Color = $greenBrush },
            @{ Name = "Ahmet Y" + [char]0x0131 + "lmaz"; Unit = "Maltepe Daire 4"; Amount = "₺ 7.500"; Status = ([char]0x23F3 + " Gecikti"); Color = $redBrush }
        )

        $ty = $py + 530
        foreach ($t in $tenants) {
            $g.FillRectangle($cardBrush, ($px + 40), $ty, ($pw - 80), 150)
            $g.DrawString($t.Name, $fontCardTitle, $whiteBrush, ($px + 70), ($ty + 25))
            $g.DrawString($t.Unit, $fontSmall, $mutedBrush, ($px + 70), ($ty + 65))
            $g.DrawString($t.Amount, $fontCardTitle, $whiteBrush, ($px + 620), ($ty + 25))
            $g.DrawString($t.Status, $fontSmallBold, $t.Color, ($px + 620), ($ty + 65))
            $ty += 180
        }

        $fontCardTitle.Dispose()
        $fontBigNum.Dispose()
        $fontSmall.Dispose()
        $fontSmallBold.Dispose()
        $cardBrush.Dispose()
        $whiteBrush.Dispose()
        $greenBrush.Dispose()
        $mutedBrush.Dispose()
        $redBrush.Dispose()
    }

# --- SCREENSHOT 2: RESMİ PDF MAKBUZ ---
Create-Screenshot -Filename "screenshot-2.png" `
    -Category "RESM" + [char]0x0130 + " PDF K" + [char]0x0130 + "RA MAKBUZU" `
    -Headline ("Yasal Ge" + [char]0x00E7 + "erli Tahsilat Makbuzu") `
    -Subline ("Yaz" + [char]0x0131 + "yla tutar, IBAN ve ka" + [char]0x015F + "e/imza alanlar" + [char]0x0131 + " dahil") `
    -DrawContent {
        param($g, $px, $py, $pw, $ph)

        # Draw A4 Paper Document inside phone
        $paperX = $px + 50
        $paperY = $py + 50
        $paperW = $pw - 100
        $paperH = 1450

        $paperBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        $g.FillRectangle($paperBrush, $paperX, $paperY, $paperW, $paperH)
        $paperBrush.Dispose()

        # Paper Header Banner (Emerald)
        $hdrBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(4, 120, 87))
        $g.FillRectangle($hdrBrush, $paperX, $paperY, $paperW, 160)
        $hdrBrush.Dispose()

        $fontPaperTitle = New-Object System.Drawing.Font("Segoe UI", 24, [System.Drawing.FontStyle]::Bold)
        $fontDocNum = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Regular)
        $fontPaperBody = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Regular)
        $fontPaperBold = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)

        $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        $darkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(15, 23, 42))
        $grayBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(100, 116, 139))

        $g.DrawString("K" + [char]0x0130 + "RA TAHS" + [char]0x0130 + "LAT MAKBUZU", $fontPaperTitle, $whiteBrush, ($paperX + 50), ($paperY + 40))
        $g.DrawString("Makbuz No: RNT-2026-0042 • 15 Ekim 2026", $fontDocNum, $whiteBrush, ($paperX + 50), ($paperY + 95))

        # Tenant & Property Box
        $boxPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(226, 232, 240), 2)
        $g.DrawRectangle($boxPen, ($paperX + 50), ($paperY + 200), ($paperW - 100), 220)

        $g.DrawString("K" + [char]0x0130 + "RAYA VEREN (M" + [char]0x00DC + "LK SAH" + [char]0x0130 + "B" + [char]0x0130 + "):", $fontPaperBold, $grayBrush, ($paperX + 80), ($paperY + 225))
        $g.DrawString("O" + [char]0x011F + "uzhan Bilgi", $fontPaperBold, $darkBrush, ($paperX + 80), ($paperY + 265))
        $g.DrawString("TR33 0006 1005 1982 7381 2940 12", $fontPaperBody, $grayBrush, ($paperX + 80), ($paperY + 310))

        $g.DrawString("K" + [char]0x0130 + "RAC" + [char]0x0130 + " B" + [char]0x0130 + "LG" + [char]0x0130 + "LER" + [char]0x0130 + ":", $fontPaperBold, $grayBrush, ($paperX + 460), ($paperY + 225))
        $g.DrawString("Mehmet Demir", $fontPaperBold, $darkBrush, ($paperX + 460), ($paperY + 265))
        $g.DrawString("Kad" + [char]0x0131 + "k" + [char]0x00F6 + "y Daire 2 / " + [char]0x0130 + "stanbul", $fontPaperBody, $grayBrush, ($paperX + 460), ($paperY + 310))

        # Amount Box (Emerald Tint)
        $amtBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(236, 253, 245))
        $g.FillRectangle($amtBrush, ($paperX + 50), ($paperY + 460), ($paperW - 100), 200)
        $amtBrush.Dispose()

        $amtPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(16, 185, 129), 2)
        $g.DrawRectangle($amtPen, ($paperX + 50), ($paperY + 460), ($paperW - 100), 200)
        $amtPen.Dispose()

        $fontAmt = New-Object System.Drawing.Font("Segoe UI", 32, [System.Drawing.FontStyle]::Bold)
        $emeraldText = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(4, 120, 87))

        $g.DrawString("TAHS" + [char]0x0130 + "L ED" + [char]0x0130 + "LEN K" + [char]0x0130 + "RA TUTARI", $fontDocNum, $emeraldText, ($paperX + 80), ($paperY + 485))
        $g.DrawString("₺ 18.000,00", $fontAmt, $emeraldText, ($paperX + 80), ($paperY + 525))
        $g.DrawString("YAZIYLA: On Sekiz Bin T" + [char]0x00FC + "rk Liras" + [char]0x0131, $fontPaperBold, $darkBrush, ($paperX + 80), ($paperY + 600))

        # Signatures
        $g.DrawRectangle($boxPen, ($paperX + 50), ($paperY + 700), 340, 200)
        $g.DrawString("M" + [char]0x00DC + "lk Sahibi Ka" + [char]0x015F + "e & " + [char]0x0130 + "mza", $fontPaperBold, $grayBrush, ($paperX + 80), ($paperY + 720))

        $g.DrawRectangle($boxPen, ($paperX + 450), ($paperY + 700), 340, 200)
        $g.DrawString("Kirac" + [char]0x0131 + " " + [char]0x0130 + "mza", $fontPaperBold, $grayBrush, ($paperX + 530), ($paperY + 720))

        $fontPaperTitle.Dispose()
        $fontDocNum.Dispose()
        $fontPaperBody.Dispose()
        $fontPaperBold.Dispose()
        $fontAmt.Dispose()
        $whiteBrush.Dispose()
        $darkBrush.Dispose()
        $grayBrush.Dispose()
        $emeraldText.Dispose()
        $boxPen.Dispose()
    }

# --- SCREENSHOT 3: WHATSAPP REMINDER ---
Create-Screenshot -Filename "screenshot-3.png" `
    -Category ("1 TIKLA WHATSAPP HATIRLATICI") `
    -Headline ("Geciken Kiralar" + [char]0x0131 + " An" + [char]0x0131 + "nda Tahsil Edin") `
    -Subline ("Tek dokunu" + [char]0x015F + "la kirac" + [char]0x0131 + "ya IBAN ve tutar mesaj" + [char]0x0131 + " g" + [char]0x00F6 + "nderin") `
    -DrawContent {
        param($g, $px, $py, $pw, $ph)

        # WhatsApp Bubble Card
        $cardBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(11, 20, 26))
        $g.FillRectangle($cardBrush, ($px + 40), ($py + 80), ($pw - 80), 800)
        $cardBrush.Dispose()

        # WhatsApp Header
        $waHdr = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(32, 44, 51))
        $g.FillRectangle($waHdr, ($px + 40), ($py + 80), ($pw - 80), 120)
        $waHdr.Dispose()

        $fontTitle = New-Object System.Drawing.Font("Segoe UI", 20, [System.Drawing.FontStyle]::Bold)
        $fontMsg = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Regular)
        $fontSmall = New-Object System.Drawing.Font("Segoe UI", 13, [System.Drawing.FontStyle]::Regular)

        $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        $mutedBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(148, 163, 184))

        $g.DrawString("Ahmet Y" + [char]0x0131 + "lmaz (Maltepe Daire 4)", $fontTitle, $whiteBrush, ($px + 80), ($py + 115))
        $g.DrawString([char]0x2022 + " Whatsapp Sohbeti", $fontSmall, $mutedBrush, ($px + 80), ($py + 155))

        # Green Speech Bubble
        $bubbleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(0, 92, 75))
        $g.FillRectangle($bubbleBrush, ($px + 80), ($py + 250), ($pw - 160), 450)
        $bubbleBrush.Dispose()

        $msgText = "Merhaba Ahmet Bey,`n`nMaltepe Daire 4 m" + [char]0x00FC + "lk" + [char]0x00FC + "n" + [char]0x00FC + "ze ait Ekim 2026 d" + [char]0x00F6 + "nemi ₺ 7.500 kira bedelinin vadesi 3 g" + [char]0x00FC + "n ge" + [char]0x00E7 + "mi" + [char]0x015F + "tir.`n`n" +
            "Ödemeyi a" + [char]0x015F + "a" + [char]0x011F + [char]0x0131 + "daki IBAN hesab" + [char]0x0131 + "na iletmenizi rica ederiz:`n`n" +
            "IBAN: TR33 0006 1005 1982 7381 2940 12`n" +
            "Al" + [char]0x0131 + "c" + [char]0x0131 + ": O" + [char]0x011F + "uzhan Bilgi`n`n" +
            "RentLedger ile g" + [char]0x00F6 + "nderildi."

        $g.DrawString($msgText, $fontMsg, $whiteBrush, [System.Drawing.RectangleF]::FromLTRB(($px + 110), ($py + 280), ($px + $pw - 110), ($py + 670)))

        # 1-Tap Action Button
        $btnBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(37, 211, 102))
        $g.FillRectangle($btnBrush, ($px + 120), ($py + 750), ($pw - 240), 90)
        $btnBrush.Dispose()

        $fontBtn = New-Object System.Drawing.Font("Segoe UI", 20, [System.Drawing.FontStyle]::Bold)
        $darkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(11, 20, 26))
        $sf = New-Object System.Drawing.StringFormat
        $sf.Alignment = [System.Drawing.StringAlignment]::Center
        $g.DrawString("WhatsApp'ta G" + [char]0x00F6 + "nder", $fontBtn, $darkBrush, ($px + ($pw / 2)), ($py + 775), $sf)

        $fontTitle.Dispose()
        $fontMsg.Dispose()
        $fontSmall.Dispose()
        $fontBtn.Dispose()
        $whiteBrush.Dispose()
        $mutedBrush.Dispose()
        $darkBrush.Dispose()
        $sf.Dispose()
    }

# --- SCREENSHOT 4: PROPERTIES & TENANTS ---
Create-Screenshot -Filename "screenshot-4.png" `
    -Category ("KOLAY TAHS" + [char]0x0130 + "LAT G" + [char]0x0130 + "R" + [char]0x0130 + "" + [char]0x015E + [char]0x0130) `
    -Headline ("15 Saniyede Kira Tahsilat" + [char]0x0131 + " Kaydedin") `
    -Subline ("Havale, Nakit, Kart veya " + [char]0x00C7 + "ek y" + [char]0x00F6 + "ntemleriyle") `
    -DrawContent {
        param($g, $px, $py, $pw, $ph)

        $cardBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(19, 29, 48))
        $g.FillRectangle($cardBrush, ($px + 40), ($py + 80), ($pw - 80), 900)
        $cardBrush.Dispose()

        $fontTitle = New-Object System.Drawing.Font("Segoe UI", 22, [System.Drawing.FontStyle]::Bold)
        $fontLabel = New-Object System.Drawing.Font("Segoe UI", 15, [System.Drawing.FontStyle]::Bold)
        $fontVal = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Regular)

        $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        $greenBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(52, 211, 153))
        $mutedBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(148, 163, 184))

        $g.DrawString("Yeni Kira Tahsilat" + [char]0x0131 + " Kayd" + [char]0x0131, $fontTitle, $whiteBrush, ($px + 70), ($py + 120))

        # Input fields
        $fields = @(
            @{ L = "M" + [char]0x00DC + "LK & K" + [char]0x0130 + "RAC" + [char]0x0130 + ":"; V = "Kad" + [char]0x0131 + "k" + [char]0x00F6 + "y Daire 2 • Mehmet Demir" },
            @{ L = "TAHS" + [char]0x0130 + "LAT TUTARI:"; V = "₺ 18.000" },
            @{ L = "ÖDEME YÖNTEM" + [char]0x0130 + ":"; V = "Banka Havalesi / EFT" },
            @{ L = "A" + [char]0x00C7 + "IKLAMA / NOT:"; V = "Ekim 2026 Kira Bedeli" }
        )

        $iy = $py + 200
        $inputBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 41, 59))
        foreach ($f in $fields) {
            $g.DrawString($f.L, $fontLabel, $greenBrush, ($px + 70), $iy)
            $g.FillRectangle($inputBg, ($px + 70), ($iy + 35), ($pw - 140), 75)
            $g.DrawString($f.V, $fontVal, $whiteBrush, ($px + 90), ($iy + 55))
            $iy += 140
        }
        $inputBg.Dispose()

        # Save & Share Button
        $btnBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(16, 185, 129))
        $g.FillRectangle($btnBrush, ($px + 70), ($iy + 30), ($pw - 140), 90)
        $btnBrush.Dispose()

        $fontBtn = New-Object System.Drawing.Font("Segoe UI", 20, [System.Drawing.FontStyle]::Bold)
        $darkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(6, 30, 20))
        $sf = New-Object System.Drawing.StringFormat
        $sf.Alignment = [System.Drawing.StringAlignment]::Center
        $g.DrawString([char]0x2713 + " Kaydet ve PDF Makbuz Olu" + [char]0x015F + "tur", $fontBtn, $darkBrush, ($px + ($pw / 2)), ($iy + 55), $sf)

        $fontTitle.Dispose()
        $fontLabel.Dispose()
        $fontVal.Dispose()
        $fontBtn.Dispose()
        $whiteBrush.Dispose()
        $greenBrush.Dispose()
        $mutedBrush.Dispose()
        $darkBrush.Dispose()
        $sf.Dispose()
    }

# Generate Tablet screenshots by copying screenshot 1 & 2
Copy-Item (Join-Path $graphicsDir "screenshot-1.png") (Join-Path $graphicsDir "tablet-1.png") -Force
Copy-Item (Join-Path $graphicsDir "screenshot-2.png") (Join-Path $graphicsDir "tablet-2.png") -Force
Write-Host "✅ Generated all phone and tablet screenshots!"
