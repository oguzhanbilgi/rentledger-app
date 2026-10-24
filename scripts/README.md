# Otomasyon scriptleri

Tüm scriptler bağımlılıksızdır (Node 20+; `.env` otomatik yüklemesi Node 20.12+/21.7+ ister) ve **uygulama kök dizininden** çalıştırılır.
Uygulamaya özel her değer `factory.config.js` dosyasından okunur; scriptlerde uygulama adı, paket adı veya ürün kimliği yazılı değildir.

| Script | Ne yapar | Ağ |
|---|---|---|
| `verify-release.mjs` | Yayın öncesi kalite kapısı (`npm run verify:release`) | Yok |
| `factory-publish-google-play.mjs` | Play mağaza metni, AAB + sürüm, abonelikler, ömür boyu ürün | Google Play Developer API |
| `setup-revenuecat.mjs` | RevenueCat uygulaması, ürünler, entitlement, offering, paketler | RevenueCat API v2 |
| `lib/factory.mjs` | Ortak yardımcılar: `loadFactoryConfig()`, `productPrefix()`, `productIds()` | — |

## Gizli anahtarlar

Gizli anahtarlar **yalnızca ortam değişkenlerinden** okunur; komut satırı argümanı veya koda yazılmış varsayılan yol yoktur.
Kökte `.env` dosyası varsa otomatik yüklenir (zaten tanımlı değişkenler ezilmez). `.env` git'e eklenmez; şablon: `.env.example`.

| Değişken | Script | Açıklama |
|---|---|---|
| `PLAY_SERVICE_ACCOUNT_JSON` | Play | Service account JSON dosyasının **yolu** (depo dışında tutun). Zorunlu. |
| `AAB_PATH` | Play | Yüklenecek `.aab`. `--aab <yol>` veya ilk argüman önceliklidir. |
| `PLAY_TRACK` | Play | `internal` (varsayılan), `alpha`, `beta`, `production` veya kapalı test kanalı adı. |
| `LISTING_PATH` | Play | Listing JSON yolu (varsayılan `store-listing/listing.json`). `--listing <yol>` ile de verilir. |
| `RC_SECRET_KEY` | RevenueCat | v2 **gizli** anahtar (`sk_…`). Zorunlu. Asla yazdırılmaz. |
| `RC_PROJECT_ID` | RevenueCat | İsteğe bağlı. Hesapta birden çok proje varsa hangisi kullanılacak. |

## Ürün kimlikleri

Önek = `app.androidPackage` son parçası (`com.mobilefactory.veloquote` → `veloquote`):

| Anahtar | Play ürünü | Temel plan | RevenueCat ürünü | Paket |
|---|---|---|---|---|
| weekly | `<önek>_weekly` | `weekly-base` (P1W) | `<önek>_weekly:weekly-base` | `$rc_weekly` |
| monthly | `<önek>_monthly` | `monthly-base` (P1M) | `<önek>_monthly:monthly-base` | `$rc_monthly` |
| annual | `<önek>_annual` | `annual-base` (P1Y) | `<önek>_annual:annual-base` | `$rc_annual` |
| lifetime | `<önek>_lifetime` (tek seferlik) | — | `<önek>_lifetime` | `$rc_lifetime` |

Entitlement `monetization.revenueCat.entitlementId`, offering `monetization.revenueCat.offeringId` (boşsa `default`).

## Google Play: `factory-publish-google-play.mjs`

1. Listing dosyasını oluşturun ve doldurun:
   ```bash
   cp store-listing/listing.example.json store-listing/listing.json      # PowerShell: Copy-Item
   ```
   Her dil (`en-US`, `tr-TR` …) için: `title` ≤ 30, `shortDescription` ≤ 80, `fullDescription` ≤ 4000, `releaseNotes` ≤ 500,
   `subscriptionBenefits` (≤ 4 × 40), `products.<weekly|monthly|annual|lifetime>.title/description`.
   `pricing` bölümünde bölge fiyatları mikro birimdir (`3.99` → `"3990000"`).
   Metinlerde `{appName}`, `{version}`, `{supportEmail}` yer tutucuları `factory.config.js`'ten doldurulur.
2. Önce planı görün (ağ çağrısı yok, kimlik bilgisi gerekmez; `listing.json` yoksa örnek dosya kullanılır):
   ```bash
   node scripts/factory-publish-google-play.mjs --dry-run            # --verbose: istek gövdeleri
   ```
3. Gerçek çalıştırma (Play Console'da uygulama önceden oluşturulmuş ve service account'a yetki verilmiş olmalı):
   ```bash
   node scripts/factory-publish-google-play.mjs --aab ./build/app.aab
   ```

- Tüm sınırlar ve fiyatlar **API çağrısından önce** doğrulanır; hata varsa hiçbir istek gönderilmez.
  Şablon paket adı, `listing.example.json` veya `TODO` içeren metinle gerçek yayın yapılmaz.
- Sürüm kanala **draft** olarak atanır; yayına almayı Play Console'dan yapın.
- AAB verilmezse Play'de zaten yüklü en yüksek versionCode kanala atanır.

## RevenueCat: `setup-revenuecat.mjs`

```bash
node scripts/setup-revenuecat.mjs --dry-run      # plan, ağ çağrısı yok
node scripts/setup-revenuecat.mjs                # RC_SECRET_KEY .env'de veya ortamda olmalı
```

- Proje seçimi: `RC_PROJECT_ID` → adı `app.name` olan proje → hesaptaki tek proje (aksi halde liste yazdırıp durur).
- Var olan uygulama/ürün/entitlement/offering/paket yeniden oluşturulmaz.
- Sonunda public SDK anahtarı (`goog_…`) yazdırılır → `factory.config.js` → `monetization.revenueCat.androidApiKey`.
- Sıra: önce Play scripti (ürünler Play'de oluşur), sonra RevenueCat scripti.
