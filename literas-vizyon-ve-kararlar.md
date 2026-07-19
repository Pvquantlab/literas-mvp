# literas — Vizyon, Hedefler ve Alınmış Kararlar

> Bu dosya repo kökünde durur; `CLAUDE.md` buna atıfta bulunur.
> Amacı: gelecekte sorulacak soruların cevabını ŞİMDİDEN vermek.
> Claude, bir karar sorusu sormadan önce bu dosyaya bakar. Cevap buradaysa sormaz, uygular.

---

## 1. Vizyon (tek cümle)

Türkiye'nin genel amaçlı topluluk ve etkinlik platformu olmak: her ilgi alanından
topluluk burada kurulur, etkinlikler buradan duyurulur, katılım burada takip edilir —
Meetup'ın hantallığı ve abonelik baskısı olmadan. (Temmuz 2026 kararı: niş DEĞİL,
genel platform. Farklılaşma kategoriyle değil; UX kalitesi + adil fiyat + Türkçe
yerellik + şehir bazlı yoğunlaşma ile.)

## 2. Hedefler

### Kısa vade (0-3 ay) — "Çalışıyor ve güvenli"
- Aşama 1 + Aşama 2 tamamlanır (güvenlik, OG görselleri, hatırlatma, PWA, QR check-in).
- İstanbul'da, kategori fark etmeksizin 10-15 topluluk platformu aktif kullanır.
- Ölçüt: haftada en az 3 gerçek etkinlik, RSVP→check-in dönüşümü ölçülüyor.

### Orta vade (3-9 ay) — "Her hafta dönülen platform"
- Aşama 3 tamamlanır: tekrarlayan etkinlik serileri, topluluk duyuruları,
  katılım karnesi, ilgi alanına göre kişisel keşif.
- İlk 50 topluluk, ilk 1000 kayıtlı kullanıcı.
- İlk ücretli etkinlik talebi geldiğinde iyzico entegrasyonu (öncesinde DEĞİL).
- Ölçüt: bir topluluk literas'ı bırakıp Excel + WhatsApp grubuna dönmüyor.

### Uzun vade (9+ ay) — "Ölçek"
- Expo ile mobil uygulama (yalnızca PWA yetersiz kaldığı kanıtlanınca).
- Talebi kanıtlanan kategorilere opsiyonel derinlik modülleri (ör. kitap modülü: okuma takvimi; sinema modülü: vizyon takvimi).
- Gelir: ücretli etkinliklerde %3-4 tek kalem komisyon. Abonelik YOK, gizli ücret YOK —
  bu bir pazarlama vaadi değil, ürün ilkesidir.

## 3. Alınmış kararlar — TEKRAR SORMA, TEKRAR TARTIŞMA

| Konu | Karar | Neden |
|---|---|---|
| **Konumlandırma** | **Genel amaçlı platform — niş DEĞİL.** 14 CATS kategorisi eşit; kategoriye özel istekler 'kategori modülü' park alanına | Temmuz 2026 kararı; büyüme şehir bazlı yoğunlaşmayla |
| ORM / Prisma / Drizzle | **Kullanılmayacak.** Supabase JS client + SQL migration | Ek katman gereksiz; RLS zaten Postgres'te |
| Tailwind / UI kütüphanesi | **Geçilmeyecek.** Mevcut global CSS + inline style + CSS değişkenleri | Tasarım dili oturdu; toplu geçiş risk, kazanım az |
| State yönetimi (Redux/Zustand) | **Yok.** Server component + URL state + gerektiğinde context | Mevcut sihirbaz (wizard-context) deseni yeterli |
| Monorepo / ayrı backend | **Hayır.** Tek Next.js repo | MVP ölçeği; Supabase backend'in kendisi |
| Ödeme sağlayıcı | **iyzico Marketplace** (yedek: PayTR); global gerekirse Stripe | BDDK uyumlu escrow + taksit; Stripe TR'de taksit yok |
| Harita | **Leaflet kalır**; ölçekte Mapbox değerlendirilir | Ücretsiz, mevcut entegrasyon çalışıyor |
| Arama | Postgres FTS (turkish config); **>50K MAU'da** Meilisearch | Erken optimizasyon yapılmaz |
| Mobil | Önce PWA; Expo yalnızca Aşama 4'te | Rapor + maliyet |
| E-posta sağlayıcı | **Resend kalır**, domain literaslab.com | Çalışıyor |
| Auth sağlayıcı | **Supabase Auth kalır**; sosyal login (Google) eklenebilir, zorunlu değil | |
| Dil | Arayüz yalnızca Türkçe; i18n altyapısı **kurulmaz** | Hedef pazar tek; i18n erken karmaşıklık |
| Analitik | Vercel Analytics yeterli; ek araç (GA4/Posthog) şimdilik yok | KVKK yükünü erken alma |
| Test stratejisi | Kritik yol için minimal: zod şemaları + RLS smoke testleri; %100 coverage hedefi YOK | Tek geliştirici hızı |
| AI özellikleri | Aşama 4 sonrası (etkinlik açıklaması üretimi, keşif önerisi); şimdi DEĞİL | Önce çekirdek değer |

## 4. Henüz açık kararlar — sorulursa böyle ilerle

Bunlar kullanıcının (proje sahibinin) kararı. Claude bu konularda kod yazması gerekirse
**varsayılanı uygular ve tek satırla not düşer**, uzun tartışma açmaz:

| Konu | Seçenekler | Varsayılan (aksi söylenene dek) |
|---|---|---|
| Kalıcı domain | literas.com / literaslab.com / literas.app | Kodda hardcode etme; `NEXT_PUBLIC_SITE_URL` env değişkeni kullan |
| Topluluk onayı hep manuel mi? | Manuel · yarı-otomatik (ilk topluluk otomatik, sonrakiler manuel) | Manuel kalır (kalite sinyali stratejinin parçası) |
| RSVP'de misafir (auth'suz) katılım | Var · yok | Yok — hesap zorunlu (karne/güven sistemi için gerekli) |
| Komisyon oranı | %3 · %3.5 · %4 | Kodda sabitleme; `commission_rate` alanı yapılandırılabilir olsun |
| Şehir kapsamı | Sadece İstanbul · tüm Türkiye | Tüm Türkiye açık, pazarlama İstanbul odaklı |

## 5. Gelecekte gelmesi muhtemel sorular — hazır cevaplar

**"Kullanıcı sayısı artınca Supabase yeter mi?"**
Evet, eşikler yol haritası Aşama 4 tablosunda. O eşiklere gelmeden mimari değişikliği önerme.

**"X özelliğini ekleyelim mi?" (takvim senkronu, DM, forum, bildirim merkezi...)**
Süzgeç: (1) Kategori-bağımsız mı — tüm topluluk türlerine değer katıyor mu?
(Tek kategoriye özgü istekler 'kategori modülü' park alanına gider.) (2) Bir gerçek
kullanıcı istedi mi? İkisi de evetse yol haritasına madde olarak ekle, hemen kodlama.
DM/forum özellikle ERTELENDİ — moderasyon yükü erken safhada taşınamaz.

**"Kod eski görünüyor, refactor edelim mi?"**
Çalışan kodu yalnızca (a) güvenlik sorunu, (b) dokunulan dosyada zaten değişiklik
yapılıyorsa refactor et. "Güzelleştirme" PR'ı açma.

**"Şemada Y kolonu var mı emin değilim."**
`supabase/migrations/` tek doğruluk kaynağı. Orada yoksa migration'la ekle; tahminle
kod yazma.

**"Bu Türkçe metin doğru mu / nasıl yazayım?"**
Ton: samimi ama düzgün Türkçe; "sen" hitabı; emoji ölçülü (✔ ⚠️ gibi işlevsel).
Örnek mevcut metinlerden bak: ayarlar sayfaları ve e-posta şablonları referanstır.

**"Env değişkeni eklemem gerekti."**
Ekle + `.env.example`'a yaz + CLAUDE.md'deki env listesine ekle + kullanıcıya
"Vercel'e şunu ekle" diye tek satır hatırlat. Sormadan yap.

**"İki görev birbirine bağımlı çıktı."**
Küçük olanı öne al, tek commit'te birleştirme; sırayı bozacaksa kullanıcıya
tek cümleyle bildir ("2.4'ten önce 1.2 şart, onunla başlıyorum").

## 6. Yapılmayacaklar listesi (kalıcı)

- Abonelik modeli (Meetup'ın en nefret edilen yanı — asla)
- Gizli/katmanlı ücretler (Biletix şikayetlerinin kaynağı — asla)
- Reklam gösterimi (güven ürünüyüz)
- Kullanıcı verisi satışı / gereksiz veri toplama (KVKK + ilke)
- service_role anahtarının uygulama kodunda kullanımı
- İngilizce arayüz (bu bir Türkiye ürünü)

---

*Bu dosya canlıdır: yeni bir karar alındığında buraya işlenir. Bir tartışma
ikinci kez yaşanıyorsa, sonucu buraya yazmak o tartışmanın son yaşanışıdır.*
