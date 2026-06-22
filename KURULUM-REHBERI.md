# Literas MVP — Kurulum Rehberi

Bu, **gerçekten çalışan bir Literas mini uygulaması**. Etkinlik açabilir, link paylaşabilir, üyeler RSVP yapabilir. Veri Supabase'de gerçek bir veritabanına kaydedilir.

## Ne yapacak?

✅ Etkinlik oluştur (başlık, tarih, yer, kapasite)
✅ Otomatik link oluştur (`literas.com/event/abc123`)
✅ Link paylaş — başkaları link üzerinden RSVP yapsın
✅ Kim geliyor canlı görünür
✅ Kapasite dolduğunda otomatik kapanır

## Ne yapmayacak?

❌ Ödeme alma (ileride eklenir)
❌ Kullanıcı kayıt/giriş (ileride eklenir)
❌ E-posta hatırlatma (ileride eklenir)
❌ Topluluk sayfası (ileride eklenir)

Yani **tek bir özellik gerçekten çalışıyor**. Bu MVP'nin amacı: kendi kitap kulübünü gerçekten yönetebilmen ve insanlara "bak burası işliyor" diyebilmen.

---

## Önemli not önce

Bu kurulum **teknik bilgi gerektirir**. Komut satırı, hesap açma, kod düzenleme gibi adımlar var. Eğer hiç tecrübe yoksa endişelenme — adım adım gideceğim — ama 1-2 saatini ayır.

Sıkışırsan, her adım için Youtube'da rehberler var ("Next.js Supabase tutorial" yaz). En önemlisi: **paniğe kapılma**. Hata mesajları kötü görünür ama çoğu basit.

Sıkışırsan, hata mesajını kopyalayıp ChatGPT'ye veya Claude'a sor: "Bu hatayı alıyorum, ne yapmalıyım?"

---

## Bölüm 1 — Hesaplar (15 dakika)

Üç ücretsiz hesap aç:

### 1.1 GitHub hesabı

- **github.com** → "Sign up"
- E-posta + parola + kullanıcı adı (örnek: `defneaksoy`)
- E-postanı doğrula

GitHub kodlarını saklayacağın yer. Vercel buradan kodu çekip yayına alacak.

### 1.2 Supabase hesabı (veritabanı)

- **supabase.com** → "Start your project"
- "Sign in with GitHub" → GitHub hesabınla giriş yap
- Yeni proje oluştur:
  - **Project name:** `literas-mvp`
  - **Database password:** güçlü bir parola (kaydet, bir yere yaz)
  - **Region:** `Central EU (Frankfurt)` — Türkiye'ye en yakın
  - "Create new project" → 2 dakika bekle

### 1.3 Vercel hesabı (yayına alma)

- **vercel.com** → "Sign up"
- "Continue with GitHub" → GitHub hesabınla giriş yap
- Boş bırak şimdilik

---

## Bölüm 2 — Geliştirme ortamı (20 dakika)

Bilgisayarına iki şey kuracaksın:

### 2.1 Node.js (JavaScript çalıştırıcısı)

- **nodejs.org** → "LTS" sürümünü indir
- Çift tıkla, yükleyiciyi çalıştır, "Next, Next, Install"
- Kontrol et: terminal/cmd aç, `node --version` yaz, sürüm görünmeli (örnek: `v22.x.x`)

**Terminal nedir?**
- **Mac:** Spotlight → "Terminal" yaz
- **Windows:** Başlat → "PowerShell" yaz

### 2.2 VS Code (kod düzenleyicisi)

- **code.visualstudio.com** → indir, kur
- Açtığında karanlık temalı bir pencere göreceksin

---

## Bölüm 3 — Kodu indir ve aç (5 dakika)

### 3.1 Bilgisayara klasör oluştur

- Masaüstüne `literas-mvp` adında bir klasör oluştur
- Bu rehberle birlikte gelen tüm dosyaları **aynı klasör yapısıyla** içine kopyala:

```
literas-mvp/
├── app/
│   ├── event/
│   │   ├── [id]/
│   │   │   ├── page.tsx
│   │   │   ├── rsvp-form.tsx
│   │   │   └── share-box.tsx
│   │   └── new/
│   │       └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   └── supabase.ts
├── .env.example
├── .gitignore
├── next.config.js
├── package.json
├── supabase-schema.sql
└── tsconfig.json
```

### 3.2 VS Code'da aç

- VS Code'u aç → "File" → "Open Folder" → `literas-mvp` klasörünü seç
- Sol tarafta tüm dosyalar görünür

### 3.3 Terminal aç

VS Code içinde: "Terminal" menüsü → "New Terminal". Alt tarafta bir terminal açılır.

---

## Bölüm 4 — Bağımlılıkları kur (5 dakika)

Terminal'de yaz:

```bash
npm install
```

Bekle (1-3 dakika). Bittiğinde `node_modules` adlı bir klasör oluşur. Bu, projenin kullandığı tüm kütüphaneler.

---

## Bölüm 5 — Veritabanını hazırla (10 dakika)

### 5.1 Supabase'de tabloları oluştur

- **supabase.com**'a gir, projeni aç
- Sol menüde **"SQL Editor"** tıkla
- **"New query"** tıkla
- `supabase-schema.sql` dosyasındaki TÜM içeriği kopyala, SQL Editor'a yapıştır
- Sağ altta **"Run"** tıkla

Başarı mesajı görmelisin. Şimdi sol menüden **"Table Editor"** tıkla — `events` ve `rsvps` adında iki tablo görmelisin. Boş ama hazır.

### 5.2 API anahtarlarını al

- Sol menüde **"Project Settings"** (alt köşede dişli ikon)
- **"API"** sekmesi
- İki şeyi kopyala:
  - **Project URL** (örn: `https://abcdefgh.supabase.co`)
  - **anon public** key (uzun bir metin, `eyJhbGc...` ile başlar)

### 5.3 .env.local dosyasını oluştur

VS Code'da, projenin **ana klasöründe** (en üstte) yeni bir dosya oluştur:

- Sağ tıkla → "New File" → adını `.env.local` yaz (başında nokta olmalı!)
- İçine yaz:

```
NEXT_PUBLIC_SUPABASE_URL=BURAYA-PROJECT-URL-YAPIŞTIR
NEXT_PUBLIC_SUPABASE_ANON_KEY=BURAYA-ANON-KEY-YAPIŞTIR
```

Tabii ki yerlerine az önce kopyaladığın gerçek değerleri yazacaksın. Tırnak yok, boşluk yok.

---

## Bölüm 6 — Çalıştır (test et)

Terminal'de yaz:

```bash
npm run dev
```

Bekle, şuna benzer bir mesaj görmelisin:

```
✓ Ready in 2.3s
○ Local: http://localhost:3000
```

**Tarayıcıyı aç**, adres çubuğuna yaz: `localhost:3000`

🎉 **Literas çalışıyor!**

### Test et:

1. Ana sayfa → "Henüz hiçbir etkinlik yok" mesajı görmelisin
2. Sağ üstte **"+ Yeni etkinlik"** tıkla
3. Formu doldur, gönder
4. Etkinlik sayfasına yönlendirilirsin
5. Linki kopyala, başka bir tarayıcıda aç
6. RSVP yap
7. Ana sayfaya dön, etkinliğini gör

Her şey çalışıyorsa **harika, bilgisayarında gerçek bir uygulaman var**.

---

## Bölüm 7 — Canlıya al (Vercel'e yükle) — 15 dakika

Şu an sadece senin bilgisayarında çalışıyor. Başkalarının da görmesi için Vercel'e yüklemen lazım.

### 7.1 GitHub'a kodu yükle

Terminal'de:

```bash
git init
git add .
git commit -m "ilk versiyon"
```

Sonra **github.com**'a git:
- Sağ üstte "+" → "New repository"
- Adı: `literas-mvp`
- Private (kapalı) seç
- "Create repository"

GitHub sana komutlar verir. Şunları yaz (kendi kullanıcı adını koy):

```bash
git remote add origin https://github.com/SENİN-KULLANICI-ADIN/literas-mvp.git
git branch -M main
git push -u origin main
```

GitHub kullanıcı adı + şifre soracak. (Şifre yerine **Personal Access Token** gerekebilir — github.com/settings/tokens'tan oluştur.)

### 7.2 Vercel'e bağla

- **vercel.com** → "Add New" → "Project"
- GitHub'dan `literas-mvp` reposunu seç → "Import"
- **Environment Variables** kısmına .env.local'daki iki değişkeni ekle:
  - `NEXT_PUBLIC_SUPABASE_URL` → projenin URL'i
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → anon key
- "Deploy" tıkla
- 2-3 dakika bekle

✅ Yayında! Vercel sana bir adres verir: `literas-mvp-xxx.vercel.app`

### 7.3 Kendi domain'ini bağla (varsa)

`literas.com` aldıysan:
- Vercel projende → "Settings" → "Domains"
- `literas.com` yaz → ekle
- DNS ayarlarını domain sağlayıcına ekle (Vercel sana söyler)
- 5-30 dakika bekle

---

## Şimdi ne yapacaksın?

✅ Kendi kitap kulübü etkinliklerini Literas üzerinde aç
✅ Eski üyelere link gönder
✅ "Bak, kendi platformumu yapıyorum, dene" de
✅ Geri dönüt biriktir
✅ Kurucu ortak ararken bu **canlı** ürünü göster

**Bu kod artık senin başlangıç noktan.** Bir kurucu ortak bulduğunda, bu kodu ona ver. O üzerine ekleyebilir:
- Kullanıcı kayıt/giriş
- Ödeme (Stripe + iyzico)
- Topluluk sayfaları
- E-posta hatırlatma
- Mobil uygulama

---

## Sıkışırsan?

En sık karşılaşılan hatalar:

**"npm install" çalışmıyor**
→ Node.js'i tekrar kur, terminali yeniden aç

**"Cannot find module" hatası**
→ `npm install` komutunu çalıştırdığından emin ol

**"Invalid API key" hatası**
→ `.env.local` dosyasındaki değerleri kontrol et, boşluk olmamalı

**Vercel'de "Build failed"**
→ Environment variables eklemeyi unutmuş olabilirsin, "Settings → Environment Variables" kontrol et

Her hata için Google'da arat — Next.js + Supabase çok yaygın olduğu için cevabı genelde Stack Overflow'da bulursun.

---

## Önemli notlar

- **Bu kod kalitelidir ama eksiklidir.** Gerçek bir platform için kullanıcı doğrulama, ödeme, e-posta gibi şeyler lazım.
- **Supabase'in ücretsiz katmanı:** 500MB veritabanı, 2GB transfer/ay — küçük çapta MVP için fazlasıyla yeterli.
- **Vercel ücretsiz katmanı:** kişisel projeler için cömert — ilk binlerce ziyaretçide ücret ödemezsin.
- **Güvenlik:** RLS politikası şu an "herkes her şeyi yapabilir" — gerçek üretimde bunu sıkılaştırmak lazım. Kurucu ortağın geldiğinde ilk yapacağı işlerden biri bu.

---

## Son sözüm

Buraya kadar geldiysen, harika iş çıkardın. Çoğu fikir bu aşamaya bile gelmez. Bu uygulama artık **konuşmaktan eylemliliğe** geçişin somut kanıtı.

Bir sonraki adım kodlamak değil — **insanlara göstermek, geri dönüt almak, kurucu ortak bulmak**. Buradan sonrası sosyal iş.

Başarılar Literas'la. 🌿
