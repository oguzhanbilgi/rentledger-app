# RentLedger Pro — Google Play Store Listing

> Kurallar (docs/FACTORY_RULES.md §5): başlık ≤ 30, kısa açıklama ≤ 80, tam açıklama ≤ 4000 karakter.
> Yalnızca uygulamada **gerçekten olan** özellikler yazılır. "Resmî / yasal geçerli / onaylı" iddiası yok.
> Play'e yüklenen metin `store-listing/listing.json` dosyasındadır (`npm run publish:play`); bu dosya ile aynı tutun.
> Ekran görüntüleri **gerçek uygulama ekranlarından** alınmalıdır (sentetik/çizilmiş görsel yasak) ve Play Console'a
> elle yüklenir. Feature graphic: `store-listing/graphics/feature-graphic-1024x500.png` (EN) ve `-tr.png` (TR) —
> `scripts/generate-store-graphics.ps1` ile üretilir.

---

## 🇹🇷 Türkçe (TR)

### Uygulama Başlığı (29/30)
```text
RentLedger: Kira Takip Makbuz
```

### Kısa Açıklama (78/80)
```text
Kira ve kiracı takibi, WhatsApp hatırlatma ve PDF kira makbuzu tek uygulamada.
```

### Tam Açıklama
```text
RentLedger Pro, ev sahipleri ve küçük mülk yöneticileri için sade bir kira defteridir. Kiracılarınızı ve kira tahsilatlarınızı kaydedin, vadesi gelen kiraları görün, WhatsApp ile hatırlatma gönderin ve saniyeler içinde PDF kira makbuzu paylaşın.

MÜLK VE KİRACI KAYDI
• Daire, müstakil ev, dükkan, ofis ve depo kaydedin.
• Kiracının adı, telefonu, isteğe bağlı TC kimlik / vergi numarası, aylık kira, depozito ve ödeme günü.
• Her kiracı için ayrı para birimi: TRY, USD, EUR veya GBP.
• Kiracıyı tek dokunuşla arayın veya WhatsApp sohbeti başlatın.

KİRA TAHSİLATI
• Tutar, kira dönemi, ödeme tarihi ve ödeme yöntemi (havale/EFT, nakit, kredi kartı) ile kayıt.
• İsteğe bağlı not (ör. "aidat dahil").
• Her tahsilata yıl bazında sıralı makbuz numarası verilir (RL-2026-0001); silinen kayıtların numarası tekrar kullanılmaz.

PDF KİRA MAKBUZU
• A4 makbuz: makbuz numarası, ödeme tarihi ve yöntemi, ev sahibi ve kiracı bilgileri, IBAN.
• Tutar yazıyla (Türkçe veya İngilizce, kuruş/cent dahil).
• Kiracı ve ev sahibi imza alanları.
• WhatsApp, e-posta veya istediğiniz uygulamayla paylaşın.
• Makbuzlar ev sahibi tarafından hazırlanır; vergi belgesi yerine geçmez.

VADE TAKİBİ VE WHATSAPP HATIRLATMA
• Bu ay vadesi yaklaşan (5 gün) ve geciken kiralar panelde listelenir.
• Ödeme bilgileri (banka, IBAN) eklenmiş hazır WhatsApp hatırlatma mesajı.
• Tahsilat sonrası kiracıya WhatsApp ile ödeme onayı mesajı.

AYLIK ÖZET
• Bu ay beklenen, tahsil edilen ve kalan kira — her para birimi ayrı gösterilir.

GİZLİLİK
• Hesap yok. Verileriniz yalnızca cihazınızda saklanır.
• Türkçe ve İngilizce arayüz; koyu, aydınlık veya sistem teması.

ÜCRETSİZ VE PRO
• Ücretsiz: 3 PDF makbuz (kısa bir video izleyerek ek hak kazanılabilir), en fazla 2 mülk, reklamlı.
• Pro: sınırsız PDF makbuz, sınırsız mülk ve kiracı, reklamsız; makbuz ve mesajlarda uygulama bağlantısı yer almaz.
```

---

## 🇬🇧 English (EN)

### App Title (30/30)
```text
RentLedger: Rent & Tenant Book
```

### Short Description (76/80)
```text
Track rent and tenants, send WhatsApp reminders and share PDF rent receipts.
```

### Full Description
```text
RentLedger Pro is a simple rent ledger for landlords and small property managers. Record tenants and rent payments, see which rents are due, send WhatsApp reminders and share a PDF rent receipt in seconds.

PROPERTIES & TENANTS
• Save apartments, houses, shops, offices and storage units.
• Tenant name, phone, optional ID / tax number, monthly rent, deposit and due day.
• A separate currency per tenant: TRY, USD, EUR or GBP.
• Call a tenant or start a WhatsApp chat with one tap.

RENT PAYMENTS
• Record the amount, rent period, payment date and method (bank transfer, cash, credit card).
• Optional note (e.g. "includes building fees").
• Every payment gets a sequential receipt number per year (RL-2026-0001); numbers of deleted payments are never reused.

PDF RENT RECEIPTS
• A4 receipt with receipt number, payment date and method, landlord and tenant details and IBAN.
• Amount in words (English or Turkish, including cents).
• Tenant and landlord signature lines.
• Share by WhatsApp, email or any app you choose.
• Receipts are prepared by the landlord and do not replace tax documents.

DUE DATES & WHATSAPP REMINDERS
• Rents due in the next 5 days and overdue rents for the current month are listed on the dashboard.
• Ready-to-send WhatsApp reminders with your payment details (bank, IBAN).
• Payment confirmation messages to tenants after you record a payment.

MONTHLY SUMMARY
• Expected, collected and outstanding rent for the month — shown separately for each currency.

PRIVACY
• No account. Your records are stored only on your device.
• English and Turkish interface; dark, light or system theme.

FREE AND PRO
• Free: 3 PDF receipts (earn more by watching a short video), up to 2 properties, with ads.
• Pro: unlimited PDF receipts, unlimited properties and tenants, no ads, and no app link on receipts or messages.
```

---

## Google Play metadata

- **Category:** Business (alternative: Finance)
- **Tags:** Real estate, Business, Personal finance, Productivity
- **Target audience:** 18+ (landlords, property managers)
- **Monetization:** Free with ads (Google AdMob banner, interstitial after a shared receipt, rewarded video for an extra receipt) + in-app subscriptions / lifetime purchase (Google Play Billing via RevenueCat)
- **Privacy policy URL:** `https://oguzhanbilgi.github.io/obappstudio-legal/rentledger-privacy.html` (source text: `docs/index.html`)
- **Support email:** `oguzhanbilgidev@gmail.com`
- **Data safety (summary):** App data stays on device (not collected). AdMob: device or other IDs, approximate location, app interactions, diagnostics — collected for advertising/analytics/fraud prevention, consent via UMP. RevenueCat/Play: purchase history and an anonymous app user ID — collected for app functionality (purchase verification). No data sold.
