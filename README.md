# RentLedger Pro

Ev sahipleri için kira defteri: mülk ve kiracı kaydı, kira tahsilatı, vadesi gelen / geciken kira listesi,
WhatsApp hatırlatma ve PDF kira makbuzu. ObAppStudio · MobileFactory "Altın Şasi v2" şablonu üzerine kuruludur.

> Yapay zekâ asistanları için kurallar: [AGENTS.md](AGENTS.md) · Fabrika kuralları: [docs/FACTORY_RULES.md](docs/FACTORY_RULES.md)

## Geliştirme

```bash
npm ci
npx expo start            # Expo Go: satın alma / reklam "geliştirme önizlemesi" modunda
npm run typecheck
npx expo export --platform android
npm run verify:release    # yayın öncesi kontrol
```

Tüm uygulama kimlikleri `factory.config.js` içindedir (app.json yoktur).

## Uygulamaya özel yapı

```
src/app/index.tsx                 Kira paneli (özet, vadeler, tahsilatlar, makbuz)
src/app/properties.tsx            Mülkler ve kiracılar
src/app/explore.tsx               Ayarlar (ev sahibi bilgileri, Pro, tema, dil, para birimi, yasal)
src/services/rentledger-data.ts   SQLite deposu (tablolar: database.ts → MIGRATIONS)
src/services/rent-format.ts       Kira dönemi (YYYY-MM), tarih ve etiket yardımcıları
src/services/rent-reminders.ts    Vade uyarıları + WhatsApp mesajları
src/services/rent-summary.ts      Para birimi başına aylık özet
src/services/receipt-pdf-generator.ts  A4 kira makbuzu (buildPdfHtml + escapeHtml)
src/services/amount-in-words.ts   Tutar yazıyla (TR/EN; TRY/USD/EUR/GBP)
src/services/whatsapp.ts          wa.me bağlantısı ve telefon numarası normalleştirme
src/features/onboarding-steps.tsx Kurulum sihirbazı soruları ve örnek makbuz önizlemesi
```

## Yayın öncesi sahibin yapması gerekenler

- RevenueCat'te **RentLedger Pro'nun kendi** public SDK anahtarını (`goog_…`) `factory.config.js` → `monetization.revenueCat.androidApiKey` alanına yazın.
- AdMob uygulama ve birim kimliklerini `factory.config.js` → `monetization.admob` alanına yazın.
- `docs/index.html` metnini `obappstudio-legal` deposunda `rentledger-privacy.html` / `rentledger-terms.html` olarak yayımlayın.
- Gerçek uygulama ekranlarından ekran görüntüsü alıp Play Console'a yükleyin (eski sentetik görseller silindi).
- Mağaza metinleri: `store-listing/listing.json` (`npm run publish:play -- --dry-run`). RevenueCat kurulumu:
  `npm run setup:revenuecat -- --dry-run`. Gizli anahtarlar yalnızca ortam değişkenlerinden okunur:
  `RC_SECRET_KEY`, `PLAY_SERVICE_ACCOUNT_JSON` (bkz. `.env.example`, `scripts/README.md`).
