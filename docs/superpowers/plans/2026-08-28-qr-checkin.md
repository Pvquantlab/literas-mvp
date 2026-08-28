# QR ile giriş (check-in) — Uygulama Planı

> **Agentic çalışanlar için:** GEREKLİ ALT BECERİ: Bu planı görev görev uygulamak
> için `superpowers:subagent-driven-development` (önerilen) veya
> `superpowers:executing-plans` kullan. Adımlar takip için `- [ ]` kutucuk
> sözdizimi kullanıyor.

**Amaç:** Organizatör etkinlik kapısında katılımcının QR'ını telefon kamerasıyla okutup girişini kaydedebilsin.

**Mimari:** Token `rsvps` tablosunda duruyor ve kolon bazlı yetkiyle korunuyor. Tüm okuma/yazma dört `SECURITY DEFINER` fonksiyon üzerinden; yetki kontrolü fonksiyonun içinde. QR sunucuda inline SVG olarak üretiliyor, istemciye ek JS inmiyor.

**Teknoloji:** Next.js 16 App Router, Supabase (Postgres + RLS), `qrcode` paketi (yalnızca sunucuda).

**Spec:** `docs/superpowers/specs/2026-08-28-qr-checkin-design.md`

## Global Kısıtlar

Bunlar `CLAUDE.md`'den gelir ve **her görev için** geçerlidir:

- Kullanıcıya görünen tüm metin **Türkçe**.
- Her API rotası ve server action sırası: `auth.getUser()` → rate limit → zod → yetki.
- Yeni tablo/kolon = migration dosyası + RLS politikası + gerekli index. İstisnasız.
- Tarih/saat için `lib/date.ts` kullanılır. Çıplak `toLocaleDateString`/`toISOString` yasak — sunucu UTC'de koşuyor.
- Her görev sonunda `npm run build`, `npm run lint`, `npm run typecheck` geçmeli.
- `vercel.json`'a yorum ya da bilinmeyen anahtar eklenmez (deploy'u kırar).
- Bu projede test koşucusu (jest/vitest) **yok**. Doğrulama üç yolla yapılır:
  SQL fonksiyonları için işlem geri alan `DO` blokları, saf TS modülleri için
  `node --experimental-strip-types`, uçlar için `curl`.

## Dosya Yapısı

| Dosya | Sorumluluk |
|---|---|
| `supabase/migrations/20260828120000_qr_checkin.sql` | Şema + 5 fonksiyon + yetkiler |
| `lib/qr.ts` | Metinden inline SVG QR üretir. Saf, yan etkisiz. |
| `app/event/[id]/checkin-qr.tsx` | Katılımcının QR bloğu (server component) |
| `app/event/[id]/page.tsx` | QR bloğunu ve yöneticiye check-in bağlantısını yerleştirir |
| `app/event/[id]/checkin/page.tsx` | Organizatör sayfası: sayaç görünümü + onay görünümü |
| `app/event/[id]/checkin/actions.ts` | `girisiOnayla` / `girisiGeriAl` server action'ları |
| `supabase/schema.sql` | Baseline güncellenir |

---

### Görev 1: Veritabanı — şema, yetkiler, fonksiyonlar

**Dosyalar:**
- Oluştur: `supabase/migrations/20260828120000_qr_checkin.sql`

**Arayüzler:**
- Üretir: `checkin_kodum(uuid) -> uuid` · `checkin_dogrula(uuid) -> TABLE(rsvp_id uuid, event_id uuid, katilimci_adi text, checked_in_at timestamptz)` · `checkin_yap(uuid) -> TABLE(katilimci_adi text, checked_in_at timestamptz, yeni_giris boolean)` · `checkin_geri_al(uuid) -> void` · `etkinlik_yoneticisi_mi(uuid) -> boolean` (yalnızca dahili)

- [ ] **Adım 1: Migration dosyasını yaz**

```sql
-- QR ile giriş (check-in) — yol haritası 2.6
-- Tasarım: docs/superpowers/specs/2026-08-28-qr-checkin-design.md

ALTER TABLE public.rsvps
  ADD COLUMN IF NOT EXISTS checkin_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS checked_in_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS rsvps_checkin_token_key ON public.rsvps (checkin_token);

-- Kolon bazlı koruma.
-- DİKKAT: kolon bazlı REVOKE, tablo bazlı GRANT'i geçersiz kılmaz — komut
-- hatasız geçer ama hiçbir şey yapmaz. O yüzden önce tablo yetkisi kaldırılıp
-- kolonlar tek tek veriliyor. (anon'un rsvps üzerinde zaten SELECT'i yok.)
REVOKE SELECT ON public.rsvps FROM authenticated;
GRANT  SELECT (id, event_id, user_id, created_at, checked_in_at, checked_in_by)
  ON public.rsvps TO authenticated;

-- Yetki yardımcısı: etkinliğin organizatörü VEYA topluluğun onaylı
-- kurucu/yöneticisi. Yalnızca dahili kullanım, dışarıya GRANT edilmiyor.
CREATE OR REPLACE FUNCTION public.etkinlik_yoneticisi_mi(p_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = p_event_id AND e.organizer_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM events e
      JOIN community_members cm ON cm.community_id = e.community_id
      WHERE e.id = p_event_id AND cm.user_id = auth.uid()
        AND cm.role IN ('founder','admin') AND cm.status = 'approved'
    );
$$;

-- Katılımcı yalnızca KENDİ token'ını alabilir.
CREATE OR REPLACE FUNCTION public.checkin_kodum(p_event_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.checkin_token FROM rsvps r
  WHERE r.event_id = p_event_id AND r.user_id = auth.uid();
$$;

-- Önizleme: hiçbir şeyi değiştirmez.
-- Kontrol sırası bağlayıcı: önce token aranır (yoksa boş küme, yetki
-- kontrolü yapılamaz çünkü hangi etkinlik olduğu bilinmiyor), sonra yetki.
CREATE OR REPLACE FUNCTION public.checkin_dogrula(p_token uuid)
RETURNS TABLE(rsvp_id uuid, event_id uuid, katilimci_adi text, checked_in_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_event uuid;
BEGIN
  SELECT r.event_id INTO v_event FROM rsvps r WHERE r.checkin_token = p_token;
  IF v_event IS NULL THEN RETURN; END IF;
  IF NOT public.etkinlik_yoneticisi_mi(v_event) THEN RAISE EXCEPTION 'yetkisiz'; END IF;

  RETURN QUERY
    SELECT r.id, r.event_id, p.name, r.checked_in_at
    FROM rsvps r JOIN profiles p ON p.id = r.user_id
    WHERE r.checkin_token = p_token;
END;
$$;

-- Girişi işler. İdempotent: ikinci okutma zamanı değiştirmez.
CREATE OR REPLACE FUNCTION public.checkin_yap(p_token uuid)
RETURNS TABLE(katilimci_adi text, checked_in_at timestamptz, yeni_giris boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_event uuid; v_rsvp uuid; v_mevcut timestamptz;
BEGIN
  SELECT r.event_id, r.id, r.checked_in_at INTO v_event, v_rsvp, v_mevcut
  FROM rsvps r WHERE r.checkin_token = p_token;
  IF v_rsvp IS NULL THEN RETURN; END IF;
  IF NOT public.etkinlik_yoneticisi_mi(v_event) THEN RAISE EXCEPTION 'yetkisiz'; END IF;

  IF v_mevcut IS NULL THEN
    UPDATE rsvps SET checked_in_at = now(), checked_in_by = auth.uid()
    WHERE id = v_rsvp;
  END IF;

  RETURN QUERY
    SELECT p.name, r.checked_in_at, (v_mevcut IS NULL)
    FROM rsvps r JOIN profiles p ON p.id = r.user_id
    WHERE r.id = v_rsvp;
END;
$$;

-- Yanlış okutmayı geri alır.
CREATE OR REPLACE FUNCTION public.checkin_geri_al(p_token uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_event uuid; v_rsvp uuid;
BEGIN
  SELECT r.event_id, r.id INTO v_event, v_rsvp
  FROM rsvps r WHERE r.checkin_token = p_token;
  IF v_rsvp IS NULL THEN RETURN; END IF;
  IF NOT public.etkinlik_yoneticisi_mi(v_event) THEN RAISE EXCEPTION 'yetkisiz'; END IF;

  UPDATE rsvps SET checked_in_at = NULL, checked_in_by = NULL WHERE id = v_rsvp;
END;
$$;

REVOKE ALL ON FUNCTION public.etkinlik_yoneticisi_mi(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.checkin_kodum(uuid)    FROM PUBLIC;
REVOKE ALL ON FUNCTION public.checkin_dogrula(uuid)  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.checkin_yap(uuid)      FROM PUBLIC;
REVOKE ALL ON FUNCTION public.checkin_geri_al(uuid)  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.checkin_kodum(uuid)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_dogrula(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_yap(uuid)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_geri_al(uuid) TO authenticated;
```

- [ ] **Adım 2: Migration'ı canlıya uygula**

Supabase MCP `apply_migration` ile, ad: `qr_checkin`.
Değişiklik tamamen eklemeli — eski kod yeni kolonları bilmiyor, hiçbir şey kırılmaz.

- [ ] **Adım 3: Kolon yetkisinin GERÇEKTEN işlediğini doğrula**

Bu adım atlanmamalı: yanlış yazılırsa komut hatasız geçer ama token okunabilir kalır.

```sql
select
  (select count(*) from information_schema.column_privileges
   where table_name='rsvps' and grantee='authenticated'
     and privilege_type='SELECT' and column_name='checkin_token') as token_okunabilir,
  (select count(*) from information_schema.column_privileges
   where table_name='rsvps' and grantee='authenticated'
     and privilege_type='SELECT' and column_name='checked_in_at') as durum_okunabilir;
```

Beklenen: `token_okunabilir = 0`, `durum_okunabilir = 1`.

- [ ] **Adım 4: Fonksiyon davranışlarını test et (işlem geri alınarak)**

```sql
do $$
declare
  v_org uuid; v_yabanci uuid; v_event uuid; v_token uuid;
  n1 int; t1 timestamptz; t2 timestamptz; sonuc text := '';
begin
  select e.id, e.organizer_id into v_event, v_org
  from events e join rsvps r on r.event_id = e.id limit 1;
  select r.checkin_token into v_token from rsvps r where r.event_id = v_event limit 1;
  select id into v_yabanci from profiles where id <> v_org limit 1;

  -- 1) yetkisiz cagri reddedilmeli
  perform set_config('request.jwt.claims', json_build_object('sub',v_yabanci)::text, true);
  begin
    perform public.checkin_yap(v_token);
    sonuc := sonuc || 'yetkisiz=KABUL(HATA) | ';
  exception when others then
    sonuc := sonuc || 'yetkisiz=' || SQLERRM || ' | ';
  end;

  -- 2) organizator giris yapabilmeli
  perform set_config('request.jwt.claims', json_build_object('sub',v_org)::text, true);
  select checked_in_at into t1 from public.checkin_yap(v_token);
  sonuc := sonuc || 'ilk giris dolu mu=' || (t1 is not null)::text || ' | ';

  -- 3) ikinci okutma idempotent olmali
  select checked_in_at into t2 from public.checkin_yap(v_token);
  sonuc := sonuc || 'idempotent=' || (t1 = t2)::text || ' | ';

  -- 4) geri alma calismali
  perform public.checkin_geri_al(v_token);
  select count(*) into n1 from rsvps where checkin_token = v_token and checked_in_at is null;
  sonuc := sonuc || 'geri alindi=' || (n1 = 1)::text || ' | ';

  -- 5) gecersiz token bos kume donmeli, hata atmamali
  perform public.checkin_dogrula(gen_random_uuid());
  sonuc := sonuc || 'gecersiz token=sorunsuz';

  raise exception 'TEST=[%]', sonuc;   -- islemi geri alir
end $$;
```

Beklenen: `yetkisiz=yetkisiz | ilk giris dolu mu=true | idempotent=true | geri alindi=true | gecersiz token=sorunsuz`

- [ ] **Adım 5: Commit**

```bash
git add supabase/migrations/20260828120000_qr_checkin.sql
git commit -m "QR check-in: sema, kolon bazli token korumasi ve fonksiyonlar"
```

---

### Görev 2: `lib/qr.ts` — SVG QR üretimi

**Dosyalar:**
- Oluştur: `lib/qr.ts`
- Değiştir: `package.json` (bağımlılık)

**Arayüzler:**
- Tüketir: yok
- Üretir: `qrSvg(veri: string): Promise<string>` — inline `<svg>` dizesi döner

- [ ] **Adım 1: Paketi kur**

```bash
npm install --save-exact qrcode && npm install --save-dev --save-exact @types/qrcode
```

- [ ] **Adım 2: Modülü yaz**

```ts
import QRCode from 'qrcode'

/**
 * Metinden inline SVG QR üretir.
 *
 * NEDEN SVG: veri-URL'li <img> yerine inline SVG her boyutta net kalır ve
 * istemciye ek JS inmez. Üretim sunucuda yapılır.
 *
 * errorCorrectionLevel 'M': telefon ekranındaki parmak izi/yansıma altında
 * okunurluk için yeterli, QR'ı gereksiz yoğunlaştırmıyor.
 */
export async function qrSvg(veri: string): Promise<string> {
  return QRCode.toString(veri, {
    type: 'svg',
    margin: 1,
    width: 220,
    errorCorrectionLevel: 'M',
  })
}
```

- [ ] **Adım 3: Doğrula**

```bash
cd /Users/sisamlipisagor/literas-mvp && cat > qr.test.mts <<'EOF'
import { qrSvg } from './lib/qr.ts'
const svg = await qrSvg('https://www.literaslab.com/event/abc/checkin?t=xyz')
const ok = svg.startsWith('<svg') && svg.includes('viewBox') && svg.length > 500
console.log(ok ? '✓ SVG uretildi, uzunluk ' + svg.length : '✗ BEKLENMEDIK CIKTI')
process.exit(ok ? 0 : 1)
EOF
node --experimental-strip-types --no-warnings qr.test.mts; rm -f qr.test.mts
```

Beklenen: `✓ SVG uretildi, uzunluk <500'den buyuk bir sayi>`

- [ ] **Adım 4: Commit**

```bash
git add package.json package-lock.json lib/qr.ts
git commit -m "QR check-in: sunucuda inline SVG QR uretimi"
```

---

### Görev 3: Katılımcının QR'ı etkinlik sayfasında

**Dosyalar:**
- Oluştur: `app/event/[id]/checkin-qr.tsx`
- Değiştir: `app/event/[id]/page.tsx`

**Arayüzler:**
- Tüketir: `qrSvg` (Görev 2) · `checkin_kodum` RPC (Görev 1) · `SITE_URL` (`lib/site.ts`)
- Üretir: `<CheckinQr eventId={string} />` — RSVP yoksa `null` döner

- [ ] **Adım 1: Bileşeni yaz**

```tsx
import { createClient } from '@/lib/supabase-server'
import { SITE_URL } from '@/lib/site'
import { qrSvg } from '@/lib/qr'

/**
 * Katılımcının kapıda okutacağı QR.
 *
 * Token istemciye HİÇ inmez: yalnızca QR'ın içine gömülür. checkin_kodum
 * SECURITY DEFINER olduğu için kullanıcı başkasının token'ını alamaz.
 */
export default async function CheckinQr({ eventId }: { eventId: string }) {
  const supabase = await createClient()
  const { data: token } = await supabase.rpc('checkin_kodum', { p_event_id: eventId })
  if (!token) return null

  const svg = await qrSvg(`${SITE_URL}/event/${eventId}/checkin?t=${token}`)

  return (
    <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
      <div
        aria-label="Giriş QR kodun"
        style={{ lineHeight: 0, background: '#fff', padding: 8, borderRadius: 12, border: '1.5px solid var(--border)' }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
        Giriş kodun.<br />Kapıda bunu okut.
      </p>
    </div>
  )
}
```

`dangerouslySetInnerHTML` burada güvenli: içerik `qrcode` paketinin ürettiği
SVG, kullanıcı girdisi değil. Alternatifi SVG'yi elle parse etmek olurdu.

- [ ] **Adım 2: Etkinlik sayfasına yerleştir**

`app/event/[id]/page.tsx` içinde `<RsvpForm ... />` çağrısını bul.
Hemen ÜSTÜNE import, RSVP durumunda da bileşeni ekle:

```tsx
import CheckinQr from './checkin-qr'
```

`userHasRsvp` doğruyken RsvpForm'un hemen altına:

```tsx
{userHasRsvp && <CheckinQr eventId={event.id} />}
```

- [ ] **Adım 3: Yöneticiye check-in bağlantısı ekle**

Aynı dosyada `canManage` doğruyken görünen yönetim bloğuna:

```tsx
<Link href={`/event/${event.id}/checkin`} style={{ color: 'var(--ink)', fontWeight: 700 }}>
  Girişleri yönet
</Link>
```

- [ ] **Adım 4: Doğrula**

```bash
npm run typecheck && npm run lint && npm run build
```

Beklenen: üçü de hatasız.

- [ ] **Adım 5: Commit**

```bash
git add "app/event/[id]/checkin-qr.tsx" "app/event/[id]/page.tsx"
git commit -m "QR check-in: katilimcinin QR'i etkinlik sayfasinda"
```

---

### Görev 4: Organizatör check-in sayfası

**Dosyalar:**
- Oluştur: `app/event/[id]/checkin/page.tsx`
- Oluştur: `app/event/[id]/checkin/actions.ts`

**Arayüzler:**
- Tüketir: `checkin_dogrula`, `checkin_yap`, `checkin_geri_al` RPC'leri (Görev 1)
- Üretir: `girisiOnayla(formData)` ve `girisiGeriAl(formData)` server action'ları

- [ ] **Adım 1: Server action'ları yaz**

```ts
'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { checkUserRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const tokenSchema = z.object({
  event_id: z.string().uuid({ message: 'Geçersiz etkinlik' }),
  token: z.string().uuid({ message: 'Geçersiz kod' }),
})

async function calistir(formData: FormData, islem: 'yap' | 'geri_al') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (!(await checkUserRateLimit(user.id, 'normal'))) {
    return { hata: 'Çok fazla istek, biraz bekle' }
  }

  const parsed = tokenSchema.safeParse({
    event_id: formData.get('event_id'),
    token: formData.get('token'),
  })
  if (!parsed.success) return { hata: 'Geçersiz kod' }

  const { event_id, token } = parsed.data
  const { error } = await supabase.rpc(
    islem === 'yap' ? 'checkin_yap' : 'checkin_geri_al',
    { p_token: token }
  )

  if (error) {
    if (error.message?.includes('yetkisiz')) {
      return { hata: 'Bu etkinliği yönetme yetkin yok' }
    }
    console.error('[checkin] islem hatasi:', error)
    return { hata: 'İşlem başarısız, tekrar dene' }
  }

  revalidatePath(`/event/${event_id}/checkin`)
  return { hata: null }
}

export async function girisiOnayla(formData: FormData) {
  return calistir(formData, 'yap')
}

export async function girisiGeriAl(formData: FormData) {
  return calistir(formData, 'geri_al')
}
```

- [ ] **Adım 2: Sayfayı yaz**

```tsx
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDateTimeShort } from '@/lib/date'
import { girisiOnayla, girisiGeriAl } from './actions'

export default async function CheckinPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ t?: string }>
}) {
  const { id } = await params
  const { t } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/event/${id}/checkin${t ? `?t=${t}` : ''}`)

  // Token varsa: tek kişilik onay görünümü
  if (t) {
    const { data, error } = await supabase.rpc('checkin_dogrula', { p_token: t })
    if (error?.message?.includes('yetkisiz')) return <Mesaj baslik="Yetkin yok" alt="Bu etkinliği yönetme yetkin yok." />
    const kayit = data?.[0]
    if (!kayit) return <Mesaj baslik="Geçersiz kod" alt="Bu QR bu etkinliğe ait değil." />

    return (
      <main style={sayfaStil}>
        <h1 style={baslikStil}>{kayit.katilimci_adi}</h1>
        {kayit.checked_in_at ? (
          <>
            <p style={altStil}>{formatDateTimeShort(kayit.checked_in_at)}&apos;te giriş yapmış.</p>
            <form action={girisiGeriAl}>
              <input type="hidden" name="event_id" value={id} />
              <input type="hidden" name="token" value={t} />
              <button type="submit" className="btn-secondary">Girişi geri al</button>
            </form>
          </>
        ) : (
          <form action={girisiOnayla}>
            <input type="hidden" name="event_id" value={id} />
            <input type="hidden" name="token" value={t} />
            <button type="submit" className="btn-primary" style={{ fontSize: 17, padding: '14px 30px' }}>
              Girişi onayla
            </button>
          </form>
        )}
        <Link href={`/event/${id}/checkin`} style={{ marginTop: 22, display: 'inline-block', color: 'var(--muted)' }}>
          ← tüm girişler
        </Link>
      </main>
    )
  }

  // Token yoksa: sayaç + liste
  const { data: kayitlar } = await supabase
    .from('rsvps')
    .select('id, checked_in_at, user:profiles(name)')
    .eq('event_id', id)
    .order('checked_in_at', { ascending: false, nullsFirst: false })

  const toplam = kayitlar?.length ?? 0
  const giren = kayitlar?.filter((k) => k.checked_in_at).length ?? 0

  return (
    <main style={sayfaStil}>
      <h1 style={baslikStil}>Girişler</h1>
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, color: 'var(--muted)' }}>
        {toplam} kayıt · {giren} giriş
      </p>
      <ul style={{ listStyle: 'none', padding: 0, marginTop: 20 }}>
        {kayitlar?.map((k) => (
          <li key={k.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <span>{(k.user as { name?: string } | null)?.name ?? 'İsimsiz'}</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: k.checked_in_at ? 'var(--ink)' : 'var(--muted)' }}>
              {k.checked_in_at ? formatDateTimeShort(k.checked_in_at) : 'gelmedi'}
            </span>
          </li>
        ))}
      </ul>
      {toplam === 0 && <p style={altStil}>Henüz kimse katılmıyor.</p>}
    </main>
  )
}

function Mesaj({ baslik, alt }: { baslik: string; alt: string }) {
  return (
    <main style={sayfaStil}>
      <h1 style={baslikStil}>{baslik}</h1>
      <p style={altStil}>{alt}</p>
    </main>
  )
}

const sayfaStil = { maxWidth: 520, margin: '0 auto', padding: '48px 24px 80px' } as const
const baslikStil = { fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 10px' } as const
const altStil = { fontSize: 15, lineHeight: 1.6, color: 'var(--muted)' } as const
```

- [ ] **Adım 3: Yetki kapısını doğrula**

```bash
npm run build && npx next start &
sleep 6
curl -s -o /dev/null -w "girissiz: %{http_code} (307/302 bekleniyor)\n" \
  "http://localhost:3000/event/00000000-0000-0000-0000-000000000000/checkin"
kill %1
```

- [ ] **Adım 4: Doğrula ve commit**

```bash
npm run typecheck && npm run lint && npm run build
git add "app/event/[id]/checkin"
git commit -m "QR check-in: organizator sayfasi, onay ve geri alma"
```

---

### Görev 5: Baseline şema ve belgeler

**Dosyalar:**
- Değiştir: `supabase/schema.sql`
- Değiştir: `literas-yol-haritasi.md`

- [ ] **Adım 1: `supabase/schema.sql`'i güncelle**

`rsvps` tablosuna üç kolonu ekle, benzersiz indeksi indeksler bölümüne, beş
fonksiyonu fonksiyonlar bölümüne, yetki satırlarını yetkiler bölümüne.
Görev 1'deki SQL'in aynısı — baseline canlıyla birebir olmalı.

- [ ] **Adım 2: Baseline'ın canlıyla eşleştiğini doğrula**

```sql
select
  (select count(*) from information_schema.columns
   where table_schema='public' and table_name='rsvps'
     and column_name in ('checkin_token','checked_in_at','checked_in_by')) as yeni_kolon,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname like 'checkin%') as checkin_fonksiyonu;
```

Beklenen: `yeni_kolon = 3`, `checkin_fonksiyonu = 4`.
Aynı adları `supabase/schema.sql` içinde `grep` ile doğrula.

- [ ] **Adım 3: Yol haritasında 2.6'yı işaretle**

`- [ ] **2.6 QR check-in**` satırını `- [x]` yap ve altına ne yapıldığını,
kolon bazlı yetki tuzağını ve kapsam dışı bırakılanları tek paragraf yaz.

- [ ] **Adım 4: Commit**

```bash
git add supabase/schema.sql literas-yol-haritasi.md
git commit -m "QR check-in: baseline sema ve yol haritasi guncellendi"
```
