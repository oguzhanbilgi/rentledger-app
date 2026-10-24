# MobileFactory — Fabrika Kuralları (Tek Doğruluk Kaynağı)

> Bu belge önceki `AI_MASTER_KNOWLEDGE_BASE.md`, `FACTORY_CORE_RULES.md`, `DESIGN.md` ve
> `FACTORY_BLUEPRINT_2WEEK_PIPELINE.md` belgelerinin yerini alır. Çelişki olursa **bu belge ve kod** geçerlidir.
> Son güncelleme: 24.10.2026 (Altın Şasi v2)

## 1. Ürün felsefesi

- **Yerel öncelikli ve gizli:** Hesap yok, sunucu yok. Veriler cihazda SQLite'ta.
- **60 saniyede değer:** Her uygulama tek bir acil sorunu çözer (puantaj, makbuz, teklif, sözleşme…).
- **Paylaşılan çıktı = dağıtım:** Ücretsiz kullanıcının PDF'inde küçük bir "{App} ile oluşturuldu — Google Play" bağlantısı olur.
- **Dürüst iddialar:** Uygulama "resmi", "DMV onaylı", "noter onaylı", "yasal olarak geçerli" gibi
  doğrulanamayan iddialarda bulunmaz. Belgeler kullanıcı tarafından hazırlanmış şablonlardır; gerektiğinde
  "hukuki tavsiye değildir" uyarısı eklenir. (Google Play "Yanıltıcı beyan" politikası)

## 2. Teknoloji yığını (kodla aynı)

| Katman | Kullanılan |
|---|---|
| Çatı | Expo SDK 58, React Native 0.88, React 19.3, New Architecture |
| Dil | TypeScript 6, `strict` |
| Gezinme | Expo Router (dosya tabanlı) |
| Stil | NativeWind v4 + `src/constants/tokens.js` |
| Veri | `expo-sqlite` (WAL) + `kv_preferences` tablosu (MMKV kullanılmaz) |
| Abonelik | RevenueCat `react-native-purchases` |
| Reklam | `react-native-google-mobile-ads` + UMP rıza |
| Belge | `expo-print` (HTML→A4 PDF) + `expo-sharing` |
| Derleme | EAS Build (`appVersionSource: remote`) — `android/` klasörü depoya girmez |

## 3. Altın kurallar

1. **%100 tek dil.** Cihaz Türkçe ise her şey Türkçe, değilse İngilizce. Tüm metinler `src/i18n/en.ts` / `tr.ts`
   içinde; `tr` sözlüğü `Record<TranslationKey, string>` tipindedir, eksik anahtar derlemeyi kırar.
   JSX içinde `isTr ? 'a' : 'b'` üçlüsü ile metin yazılmaz. Kullanıcı Ayarlar'dan dili değiştirebilir; seçim kalıcıdır.
2. **İki görünüm.** Koyu (Obsidian) / Aydınlık / Sistem — üç yollu seçim, kalıcı. JSX'te ham hex renk yok;
   `bg-canvas dark:bg-canvas-dark` gibi token sınıfları veya `useThemeColors()` kullanılır.
3. **Veri saflığı.** Üretim tabloları boş başlar. Örnek veri yalnızca onboarding önizlemesinde, bellekte yaşar.
   Şema değişikliği yalnızca `MIGRATIONS` listesine yeni adım eklenerek yapılır; yayınlanmış adım değiştirilmez.
4. **15–30 sn onboarding.** 6 adım: rol → mevcut yöntem → en büyük sorun → hedef → 3,1 sn kalibrasyon → önizleme.
   Cevaplar `app_onboarding_answers` içinde saklanır; Ayarlar'dan "Kurulum sihirbazını tekrar başlat" ile en baştan açılır.
5. **Sade kurumsal kimlik.** Linear / Stripe / Braun çizgisi. Karikatür, 3D plastik, altın para, parlak efekt yok.
   Play ikonu 512×512 **tam kare** (köşeyi Play yuvarlar); içine ikinci bir yuvarlak kare çizilmez.
6. **Hızlı hareket.** Sık eylemler < 180 ms, geçişler ≤ 300 ms, splash ≤ 950 ms. `scale(0)`'dan animasyon yok.
   Haptik: seçim → `selection`, başlat → `medium`, kaydet → `success`, sil/kota → `warning`.

## 4. Para kazanma standardı

### 4.1 Abonelik (RevenueCat)
- Entitlement: `pro_access`. Paketler RevenueCat'in standart tipleri: `$rc_weekly`, `$rc_monthly`, `$rc_annual`, `$rc_lifetime`.
- Play ürün kimlikleri: `<önek>_weekly`, `<önek>_monthly`, `<önek>_annual` (abonelik) ve `<önek>_lifetime` (tek seferlik).
- **Fiyatlar koda yazılmaz.** Paywall fiyatı, dönemi ve tasarruf yüzdesini mağazadan okur.
  Önerilen başlangıç merdiveni (Play Console'da ayarlanır): haftalık $3.99 · aylık $9.99 · yıllık $29.99 · ömür boyu $49.99.
- **Pro yalnızca aktif entitlement ile açılır.** İptal, bekleyen ödeme, hata, paket yok → Pro yok.
- Simüle satın alma sadece `__DEV__` + anahtar yokken (Expo Go) çalışır ve ekranda "geliştirme önizlemesi" yazar.

### 4.2 Ücretsiz kota
- Varsayılan: 3 ücretsiz çıktı (`factory.config.js` → `quota.freeUnits`).
- Hak, çıktı **başarıyla üretildikten sonra** düşülür.
- Bonuslar: ödüllü reklam +1 (günde en fazla 3), paylaşım +1 (günde 1, toplam 3 — doğrulanamadığı için).
- Kota sayaçları "verileri sıfırla" ile silinmez.

### 4.3 Reklam (AdMob)
- Geliştirmede Google test birimleri, yayında yalnızca gerçek birimler. Gerçek birim yoksa reklam gösterilmez.
- UMP rıza formu her açılışta toplanır; Ayarlar'da "Reklam gizlilik tercihleri" (gerekliyse) bulunur.
- Banner: ana ekranın altında. Geçiş reklamı: yalnızca doğal kırılma anında (çıktı paylaşıldıktan sonra),
  her 3 tetikte bir, en az 3 dakika arayla, oturum başına en fazla 3. **Zamanlayıcıyla reklam yok.**
- Ödüllü reklam: ödül yalnızca `EARNED_REWARD` olayında. Reklam yüklenemezse "şu an video yok" denir.
- Reklam yüklenemezse sahte reklam / yer tutucu gösterilmez. Pro kullanıcıya hiçbir reklam ve rıza formu gösterilmez.

### 4.4 Değerlendirme
- Yalnızca resmi `expo-store-review` API'si; 2. başarılı çıktıdan sonra, en az 60 gün arayla.
- "5 yıldız ver" gibi yönlendirme, puan karşılığı ödül veya koordineli yorum toplama **yasak** (Play politikası).

## 5. Yasal ve mağaza

- Gizlilik politikası URL'si uygulamaya özel olmalı ve şunları açıklamalı: yerel veri, AdMob (reklam kimliği, IP,
  yaklaşık konum, cihaz bilgisi, UMP), RevenueCat (anonim kullanıcı kimliği, satın alma geçmişi), silme yolu, iletişim.
- Uygulama içi yasal metin `factory.config.js` değerleriyle otomatik doldurulur — başka uygulamanın metni kopyalanmaz.
- Tek destek e-postası: `factory.config.js` → `studio.supportEmail`.
- Mağaza listesi: başlık ≤ 30, kısa açıklama ≤ 80, tam açıklama ≤ 4000 karakter. Yalnızca uygulamada **gerçekten olan**
  özellikler yazılır. Uygulamanın desteklemediği bir dilde listeleme, "uygulama X dilinde" iddiası taşımamalıdır.
- En az 2 (önerilen 4–8) **gerçek uygulama ekranından** alınmış telefon ekran görüntüsü. Sentetik/çizilmiş ekran yasak.
- Kapalı test (14 gün, 12+ testçi) cevaplarında yalnızca gerçekten alınan geri bildirim ve yapılan değişiklik yazılır.

## 6. Güvenlik

- Depoya **asla**: RevenueCat secret key (`sk_…`), Play service account JSON, keystore dosyası/şifresi, `.env`.
- Uygulama paketine giren her şey herkese açıktır; `factory.config.js` içine yalnızca public kimlik yazılır.
- İmzalama EAS tarafından yönetilir (EAS credentials). `android/` klasörü depoya eklenmez.
- `verify-release` depoda gizli anahtar desenlerini tarar ve production build'i durdurur.

## 7. Kalite kapısı (her PR / build öncesi)

```bash
npm run typecheck                       # 0 hata
npm run lint                            # 0 hata
npx expo export --platform android      # paket derleniyor mu
npm run verify:release                  # yayın öncesi (production)
```

Manuel kontrol: koyu + aydınlık mod, TR + EN cihaz dili, ilk açılış (boş veritabanı), Pro satın alma iptali
(Pro açılmamalı), uçak modunda ödüllü reklam (ödül verilmemeli), "verileri sıfırla" sonrası kota.
