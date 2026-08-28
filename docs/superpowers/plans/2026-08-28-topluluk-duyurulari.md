# Topluluk Duyuruları — Uygulama Planı

> **Ajan işçiler için:** ZORUNLU ALT SKILL: Bu planı görev görev uygulamak için
> superpowers:subagent-driven-development (önerilen) ya da
> superpowers:executing-plans kullan. Adımlar takip için checkbox (`- [ ]`)
> söz dizimi kullanıyor.

**Hedef:** Topluluğun founder/admin'i etkinlikten bağımsız bir duyuru yazsın;
duyuru topluluk sayfasında kalıcı dursun ve onaylı üyelere e-posta gitsin.

**Mimari:** Tek yeni tablo (`community_announcements`) + RLS; yetki `SECURITY
DEFINER` `topluluk_yoneticisi_mi()` ile tek yerden çözülür. Alıcı listesi ve
bildirim izni için **yeni kod yazılmaz** — mevcut `get_member_emails()` RPC'si
zaten founder/admin doğrulaması yapıp `email_izni(user,'announcement')` ile
süzülmüş listeyi döner. Posta istek içinde, parçalı ve aralıklı gönderilir.

**Teknoloji:** Next.js 16 App Router (Server Components + server actions),
TypeScript, Supabase Postgres + RLS, zod v4, Resend, Upstash rate limit.

**Spec:** `docs/superpowers/specs/2026-08-28-topluluk-duyurulari-design.md`

## Global Kısıtlar

Her görevin gereksinimleri bu bölümü kapsar.

- Kullanıcıya görünen **TÜM** metin Türkçe.
- Her API rotası ve server action sırası: `auth.getUser()` → rate limit → zod
  → yetki kontrolü. İstisnasız.
- E-posta HTML'inde **her** değişken `escapeHtml()` ile kaçırılır.
- `service_role` anahtarı **hiçbir yerde** kullanılmaz — yetki her zaman RLS
  ya da `SECURITY DEFINER` ile çözülür.
- Yeni tablo/kolon = migration dosyası + RLS politikası + gerekli index.
- Tarih/saat yalnızca `lib/date.ts` üzerinden. Çıplak `toLocaleDateString` /
  `toISOString` **yasak** (Vercel UTC'de koşuyor, saat 3 saat kayıyor).
- Site adresi yalnızca `lib/site.ts` → `SITE_URL` üzerinden. Sabit adres yazma.
- `vercel.json`'a yorum ya da bilinmeyen anahtar **ekleme** — Vercel şema
  hatasıyla reddediyor, deploy build başlamadan kırılıyor.
- Tasarım dili korunur: `--ink`, `--muted`, `--border`, `--lime`,
  `--paper-cream`; vurgu fontu IBM Plex Mono.
- Bu projede test koşucusu (jest/vitest) **YOK**. Test dosyası yazma.
  Doğrulama: SQL için geri alınan işlem (`DO` + `RAISE`), TS için
  `node --experimental-strip-types`, uygulama için
  `npm run typecheck && npm run lint && npm run build`.
- Tek görev = tek commit ölçeği. Görev dışına taşan "iyileştirme" yapma.

### Sabitler (birebir kullanılacak)

```ts
const PARCA_BOYU = 5             // aynı anda gidecek posta sayısı
const PARCALAR_ARASI_MS = 1000   // parçalar arası bekleme
const ANLIK_ALICI_TAVANI = 100   // üstünde kuyruğa düşer
const GUNLUK_DUYURU_SINIRI = 3   // topluluk başına, son 24 saat
```

Uzunluk sınırları: `title` 3–120, `body` 10–3000.

---

## Dosya Yapısı

| Dosya | Sorumluluk |
|---|---|
| `supabase/migrations/20260829100000_topluluk_duyurulari.sql` | tablo, index, RLS, `topluluk_yoneticisi_mi`, kolon bazlı yetkiler |
| `lib/validations.ts` *(değişecek)* | `duyuruSchema` |
| `lib/email.ts` *(değişecek)* | `sendChunkedEmail`, `escapeHtml` (dışa aktarılır) |
| `app/api/event/route.ts` *(değişecek)* | yerel `escapeHtml` kopyası silinir, `lib/email.ts`'ten alınır |
| `components/ayarlar-durum.tsx` *(değişecek)* | isteğe bağlı `mesaj` prop'u |
| `app/community/[id]/duyuru/actions.ts` | `duyuruYayinla`, `duyuruGuncelle`, `duyuruSil` |
| `app/community/[id]/duyuru/page.tsx` | tüm duyurular listesi + sonuç şeridi |
| `app/community/[id]/duyuru/yeni/page.tsx` | yazma formu |
| `app/community/[id]/duyuru/[duyuruId]/duzenle/page.tsx` | düzenleme + silme |
| `app/community/[id]/duyurular.tsx` | topluluk sayfasındaki "Duyurular" bölümü |
| `app/community/[id]/page.tsx` *(değişecek)* | bölümü yerleştirir |
| `supabase/schema.sql` *(değişecek)* | baseline |
| `literas-yol-haritasi.md`, `CLAUDE.md` *(değişecek)* | madde işaretlenir |

---

## Görev 1: Veritabanı — tablo, RLS, yetki fonksiyonu

**Dosyalar:**
- Oluştur: `supabase/migrations/20260829100000_topluluk_duyurulari.sql`

**Arayüzler:**
- Tüketir: yok
- Üretir:
  - tablo `public.community_announcements(id uuid, community_id uuid, author_id uuid, title text, body text, created_at timestamptz, updated_at timestamptz, sent_count integer)`
  - `public.topluluk_yoneticisi_mi(p_community_id uuid) -> boolean` (`SECURITY DEFINER`, içeride `auth.uid()`; `authenticated`'a `GRANT EXECUTE` verilir)

- [ ] **Adım 1: Migration dosyasını yaz**

```sql
-- Topluluk duyuruları: organizatörün etkinlikten bağımsız üye iletişimi.

-- -----------------------------------------------------------------------------
-- 1. Ortak yetki yüklemi
-- -----------------------------------------------------------------------------
-- get_member_emails içindeki founder/admin kontrolü üç RLS politikasında ve
-- iki sayfa kapısında tekrar edilecekti. Tek yerde tutuluyor ki ayrışamasınlar.
--
-- SECURITY DEFINER olması ayrıca RLS özyinelemesini önlüyor: politika
-- community_members'a bakıyor, o da kendi politikasını tetiklemiyor.
--
-- GRANT vermek güvenli: fonksiyon içeride auth.uid() kullanıyor, yani çağıran
-- yalnızca KENDİ yetkisini sorabiliyor. Dönen bilgi zaten kendisinin bildiği
-- bir şey. (etkinlik_yoneticisi_mi için verilen kararla birebir aynı.)
CREATE OR REPLACE FUNCTION public.topluluk_yoneticisi_mi(p_community_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = p_community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('founder','admin')
      AND cm.status = 'approved'
  );
$function$;

REVOKE ALL ON FUNCTION public.topluluk_yoneticisi_mi(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.topluluk_yoneticisi_mi(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. Tablo
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_announcements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  -- Yazar silinse de duyuru kalsın: kalan üyeler geçmişi kaybetmemeli.
  author_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title        text NOT NULL,
  body         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz,
  -- Kaç kişiye ULAŞTI. Üye sayısıyla aynı olmak zorunda değil: bildirim
  -- tercihini kapatmış üyeler get_member_emails tarafından süzülüyor.
  sent_count   integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS community_announcements_community_created_idx
  ON public.community_announcements (community_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 3. RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.community_announcements ENABLE ROW LEVEL SECURITY;

-- Duyuru üye iletişimidir ("salon değişti", "kapı kodu 1234"). Postayı zaten
-- yalnızca üyeler alıyor; sayfa da aynı kitleyi görmeli.
CREATE POLICY "Duyurulari onayli uye okur" ON public.community_announcements
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = community_announcements.community_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  ));

CREATE POLICY "Duyuruyu yonetici yazar" ON public.community_announcements
  FOR INSERT WITH CHECK (
    public.topluluk_yoneticisi_mi(community_id) AND author_id = auth.uid()
  );

CREATE POLICY "Duyuruyu yonetici gunceller" ON public.community_announcements
  FOR UPDATE USING (public.topluluk_yoneticisi_mi(community_id));

CREATE POLICY "Duyuruyu yonetici siler" ON public.community_announcements
  FOR DELETE USING (public.topluluk_yoneticisi_mi(community_id));

-- -----------------------------------------------------------------------------
-- 4. Yetkiler
-- -----------------------------------------------------------------------------
-- ÖLÇÜLDÜ: migration rolü (postgres) ile oluşturulan tabloda authenticated
-- yalnızca Dxtm (TRUNCATE/REFERENCES/TRIGGER/MAINTAIN) alıyor; SELECT/INSERT/
-- UPDATE/DELETE gelmiyor. Yani aşağıdakiler tek kaynak.
--
-- DİKKAT: bu tablo panelden (supabase_admin olarak) oluşturulsaydı varsayılan
-- yetki arwdDxtm olurdu ve aşağıdaki kolon kısıtları SESSİZCE anlamsızlaşırdı
-- -- kolon bazlı yetki, tablo bazlı GRANT'i ezmez. Tabloyu her zaman
-- migration ile oluştur.
GRANT SELECT ON public.community_announcements TO authenticated;
GRANT DELETE ON public.community_announcements TO authenticated;

-- created_at ve id istemciden yazılamaz: created_at sıralamayı belirliyor,
-- uydurulabilseydi bir duyuru akışın başına çivilenebilirdi.
GRANT INSERT (community_id, author_id, title, body)
  ON public.community_announcements TO authenticated;

-- community_id BİLİNÇLİ olarak yok: UPDATE politikasında yalnızca USING var,
-- WITH CHECK yok. Kolon güncellenebilseydi bir yönetici duyuruyu yönetmediği
-- bir topluluğa taşıyabilirdi. İki koruma birbirine bağlı.
GRANT UPDATE (title, body, updated_at, sent_count)
  ON public.community_announcements TO authenticated;
```

- [ ] **Adım 2: Migration'ı canlıya uygula**

Supabase MCP `apply_migration` ile, ad: `topluluk_duyurulari`, proje kimliği
`gwcanlhrzkvhrlbueakb`.

- [ ] **Adım 3: Yapıyı doğrula**

`execute_sql` ile çalıştır, çıktıyı rapora **birebir** yaz:

```sql
select
  (select count(*) from information_schema.tables
   where table_schema='public' and table_name='community_announcements') as tablo,
  (select count(*) from pg_indexes
   where indexname='community_announcements_community_created_idx') as indeks,
  (select relrowsecurity from pg_class where relname='community_announcements') as rls_acik,
  (select count(*) from pg_policy p join pg_class c on c.oid=p.polrelid
   where c.relname='community_announcements') as politika_sayisi,
  (select prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='topluluk_yoneticisi_mi') as fn_security_definer,
  has_function_privilege('authenticated','public.topluluk_yoneticisi_mi(uuid)','EXECUTE') as fn_yetki,
  (select count(*) from information_schema.column_privileges
   where table_name='community_announcements' and grantee='authenticated'
     and privilege_type='INSERT' and column_name in ('created_at','id','updated_at','sent_count')) as yazilamaz_kolon_sizintisi,
  (select count(*) from information_schema.column_privileges
   where table_name='community_announcements' and grantee='authenticated'
     and privilege_type='UPDATE' and column_name='community_id') as community_id_guncellenebilir;
```

Beklenen: `tablo=1`, `indeks=1`, `rls_acik=true`, `politika_sayisi=4`,
`fn_security_definer=true`, `fn_yetki=true`,
`yazilamaz_kolon_sizintisi=0`, `community_id_guncellenebilir=0`.

- [ ] **Adım 4: RLS'i üç rolle test et (geri alınan işlem)**

Test kendi kimliklerini keşfeder. `86d3d8cd-ae3f-4c39-a832-a08b4ef09b45`
topluluğunun bir yöneticisi ve bir düz üyesi olduğu doğrulandı; blok yine de
uygun bir topluluğu kendisi arar.

```sql
DO $test$
DECLARE
  v_top uuid; v_yonetici uuid; v_uye uuid; v_yabanci uuid;
  v_duyuru uuid;
  r_uye_okur text := 'HAYIR'; r_yabanci_okur text := 'EVET';
  r_uye_yazar text := 'EVET'; r_yonetici_yazar text := 'HAYIR';
  r_created_at_yazilir text := 'EVET';
  v_rapor text;
BEGIN
  -- Hem yöneticisi hem düz üyesi olan bir topluluk bul
  SELECT cm.community_id INTO v_top
  FROM community_members cm WHERE cm.status='approved'
  GROUP BY cm.community_id
  HAVING count(*) FILTER (WHERE cm.role IN ('founder','admin')) > 0
     AND count(*) FILTER (WHERE cm.role = 'member') > 0
  LIMIT 1;
  IF v_top IS NULL THEN RAISE EXCEPTION 'TEST KURULAMADI: uygun topluluk yok'; END IF;

  SELECT user_id INTO v_yonetici FROM community_members
   WHERE community_id=v_top AND status='approved' AND role IN ('founder','admin') LIMIT 1;
  SELECT user_id INTO v_uye FROM community_members
   WHERE community_id=v_top AND status='approved' AND role='member' LIMIT 1;
  SELECT p.id INTO v_yabanci FROM profiles p
   WHERE p.id NOT IN (SELECT user_id FROM community_members WHERE community_id=v_top) LIMIT 1;

  -- Yönetici yazabilmeli
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_yonetici)::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO community_announcements (community_id, author_id, title, body)
    VALUES (v_top, v_yonetici, 'deneme baslik', 'deneme govde metni')
    RETURNING id INTO v_duyuru;
    r_yonetici_yazar := 'EVET';
  EXCEPTION WHEN OTHERS THEN r_yonetici_yazar := 'HAYIR: ' || SQLERRM;
  END;

  -- created_at istemciden yazılamamalı (kolon yetkisi yok)
  BEGIN
    INSERT INTO community_announcements (community_id, author_id, title, body, created_at)
    VALUES (v_top, v_yonetici, 'sahte tarih', 'akisin basina civilenmek icin', '1999-01-01');
    r_created_at_yazilir := 'EVET';
  EXCEPTION WHEN OTHERS THEN r_created_at_yazilir := 'HAYIR';
  END;

  -- Düz üye okuyabilmeli ama yazamamalı
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uye)::text, true);
  SET LOCAL ROLE authenticated;
  IF EXISTS (SELECT 1 FROM community_announcements WHERE id = v_duyuru) THEN
    r_uye_okur := 'EVET';
  END IF;
  BEGIN
    INSERT INTO community_announcements (community_id, author_id, title, body)
    VALUES (v_top, v_uye, 'uye yaziyor', 'yazabilmemeli');
    r_uye_yazar := 'EVET';
  EXCEPTION WHEN OTHERS THEN r_uye_yazar := 'HAYIR';
  END;

  -- Üye olmayan okuyamamalı
  RESET ROLE;
  IF v_yabanci IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_yabanci)::text, true);
    SET LOCAL ROLE authenticated;
    IF NOT EXISTS (SELECT 1 FROM community_announcements WHERE id = v_duyuru) THEN
      r_yabanci_okur := 'HAYIR';
    END IF;
    RESET ROLE;
  ELSE
    r_yabanci_okur := 'ATLANDI: uye olmayan profil yok';
  END IF;

  v_rapor := format(
    'yonetici_yazar=%s | uye_okur=%s | uye_yazar=%s | yabanci_okur=%s | created_at_yazilir=%s',
    r_yonetici_yazar, r_uye_okur, r_uye_yazar, r_yabanci_okur, r_created_at_yazilir
  );
  RAISE EXCEPTION 'TEST SONUCU >>> %', v_rapor;
END;
$test$;
```

Beklenen: `yonetici_yazar=EVET | uye_okur=EVET | uye_yazar=HAYIR |
yabanci_okur=HAYIR | created_at_yazilir=HAYIR`.

- [ ] **Adım 5: Kalıntı olmadığını doğrula**

```sql
select count(*) as kalinti from public.community_announcements;
```

Beklenen: `0`. (`RAISE` işlemi geri sardığı için test satırları kalmamalı.)

- [ ] **Adım 6: Commit**

```bash
git add supabase/migrations/20260829100000_topluluk_duyurulari.sql
git commit -m "duyurular: tablo, RLS ve topluluk_yoneticisi_mi"
```

---

## Görev 2: Kütüphane katmanı

Üçü de küçük, saf ve tek başına gözden geçirilmeye değmeyecek eklemeler;
üçü de Görev 3 tarafından tüketiliyor. Tek görevde toplanıyorlar.

**Dosyalar:**
- Değiştir: `lib/validations.ts` (dosyanın **sonuna** ekle)
- Değiştir: `lib/email.ts`
- Değiştir: `app/api/event/route.ts` (yerel `escapeHtml` kopyası silinir)
- Değiştir: `components/ayarlar-durum.tsx`

**Arayüzler:**
- Tüketir: yok
- Üretir:
  - `duyuruSchema` — `{ community_id: string, title: string, body: string }`
  - `escapeHtml(str: string): string` (`lib/email.ts`'ten dışa aktarılır)
  - `sendChunkedEmail({to, subject, html}, etiket, {parcaBoyu?, bekleMs?}) -> Promise<{gonderildi: number; basarisiz: number}>`
  - `AyarlarDurum` artık isteğe bağlı `mesaj?: string` alıyor

- [ ] **Adım 1: `duyuruSchema`'yı ekle**

`lib/validations.ts` dosyasının **sonuna**. Mevcut `uuid` ve `trimmed`
yardımcılarını kullanır — yenisini tanımlama:

```ts
// ---- Topluluk duyuruları --------------------------------------------------

export const duyuruSchema = z.object({
  community_id: uuid,
  title: trimmed(3, 120, 'Başlık'),
  body: trimmed(10, 3000, 'Duyuru metni'),
})
```

- [ ] **Adım 2: `escapeHtml`'i `lib/email.ts`'e taşı**

`lib/email.ts` içine ekle (dosyanın üst kısmına, `FROM` sabitinin yakınına):

```ts
/**
 * E-posta HTML'ine giren HER değişken buradan geçer (CLAUDE.md kural 3).
 * Eskiden app/api/event/route.ts içinde yerel bir kopyası vardı; duyurular
 * da aynısına ihtiyaç duyunca ikinci kopya çıkarmak yerine buraya alındı.
 */
export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
```

Sonra `app/api/event/route.ts` içindeki **yerel `escapeHtml` fonksiyonunu
sil** (8–16. satırlar civarı) ve importu güncelle:

```ts
import { sendBulkEmail, escapeHtml } from '@/lib/email'
```

- [ ] **Adım 3: `sendChunkedEmail`'i yaz**

`lib/email.ts` içine, `sendBulkEmail`'in altına:

```ts
/**
 * Alıcılara PARÇALAR hâlinde gönderir.
 *
 * NEDEN: sendBulkEmail hepsini Promise.all ile aynı anda yolluyor. Resend
 * saniyelik istek sınırı uyguluyor ve sendEmail'de yeniden deneme yok —
 * sınıra çarpan alıcının postası sessizce kayboluyor. Duyuru, etkinlik
 * oluşturmaktan çok daha sık gönderilecek bir şey.
 *
 * sendBulkEmail KALDIRILMADI: app/api/event/route.ts ve üyelik postaları onu
 * kullanıyor; onları taşımak ayrı bir iştir.
 */
export async function sendChunkedEmail(
  { to, subject, html }: { to: string[]; subject: string; html: string },
  etiket: string,
  { parcaBoyu = 5, bekleMs = 1000 }: { parcaBoyu?: number; bekleMs?: number } = {}
): Promise<{ gonderildi: number; basarisiz: number }> {
  if (to.length === 0) return { gonderildi: 0, basarisiz: 0 }

  let gonderildi = 0
  let basarisiz = 0
  let ilkHata: unknown = null

  for (let i = 0; i < to.length; i += parcaBoyu) {
    const parca = to.slice(i, i + parcaBoyu)
    const sonuclar = await Promise.all(
      parca.map((email) => sendEmail({ to: [email], subject, html }))
    )
    for (const r of sonuclar) {
      if (r.ok) {
        gonderildi++
      } else {
        basarisiz++
        if (!ilkHata) ilkHata = r.error
      }
    }
    // Son parçadan sonra bekleme yok: gereksiz gecikme olurdu.
    if (i + parcaBoyu < to.length) {
      await new Promise((c) => setTimeout(c, bekleMs))
    }
  }

  if (basarisiz > 0) {
    console.error(`[${etiket}] ${basarisiz}/${to.length} mail GÖNDERİLEMEDİ:`, ilkHata)
  }

  return { gonderildi, basarisiz }
}
```

- [ ] **Adım 4: `AyarlarDurum`'a `mesaj` prop'u ekle**

`components/ayarlar-durum.tsx`. Başarı metni sabit ("Değişiklikler
kaydedildi.") — duyuruda mesaj değişken olacak. Prop **isteğe bağlı**, yani
mevcut çağrı yerleri aynen çalışmaya devam eder:

```tsx
export default function AyarlarDurum({
  durum,
  hata,
  mesaj,
}: {
  durum?: string
  hata?: string
  /** Başarı durumunda gösterilecek özel metin. Verilmezse varsayılan yazı. */
  mesaj?: string
}) {
```

ve render kısmında:

```tsx
      <span style={{ fontWeight: 600 }}>
        {basarili ? (mesaj ?? 'Değişiklikler kaydedildi.') : hata}
      </span>
```

Başka hiçbir şeye dokunma.

- [ ] **Adım 5: Parçalı göndericiyi ölç**

`RESEND_API_KEY` yokken `sendEmail` `{ok:false}` döner — yani gönderim
başarısız olur ama **parçalama ve zamanlama ölçülebilir**. Depo kökünde
geçici bir dosya oluştur (commit **etme**):

```ts
// olcum.mts
import { sendChunkedEmail } from './lib/email.ts'

const alicilar = Array.from({ length: 12 }, (_, i) => `k${i}@ornek.com`)
const t0 = Date.now()
const sonuc = await sendChunkedEmail(
  { to: alicilar, subject: 'deneme', html: '<p>deneme</p>' },
  'olcum',
  { parcaBoyu: 5, bekleMs: 100 }
)
const gecen = Date.now() - t0
console.log('sonuc=', JSON.stringify(sonuc))
console.log('gecen_ms=', gecen)
console.log('iki_bekleme_oldu_mu=', gecen >= 200)
console.log('bos_liste=', JSON.stringify(await sendChunkedEmail({ to: [], subject: 'x', html: 'y' }, 'olcum')))
```

Çalıştır:

```bash
node --experimental-strip-types olcum.mts
```

Beklenen: `sonuc={"gonderildi":0,"basarisiz":12}` (anahtar yok),
`iki_bekleme_oldu_mu=true` (12 alıcı / 5 = 3 parça → 2 bekleme),
`bos_liste={"gonderildi":0,"basarisiz":0}`.

Sonra dosyayı sil:

```bash
rm olcum.mts
```

- [ ] **Adım 6: Doğrula ve commit**

```bash
npm run typecheck && npm run lint && npm run build
git add lib/validations.ts lib/email.ts app/api/event/route.ts components/ayarlar-durum.tsx
git commit -m "duyurular: duyuruSchema, parcali gonderici, escapeHtml paylasima alindi"
```

---

## Görev 3: Server action'lar

**Dosyalar:**
- Oluştur: `app/community/[id]/duyuru/actions.ts`

**Arayüzler:**
- Tüketir: `duyuruSchema`, `sendChunkedEmail`, `escapeHtml` (Görev 2);
  `topluluk_yoneticisi_mi` (Görev 1); mevcut `get_member_emails(p_community_id, p_exclude)`,
  `checkUserRateLimit(userId, tier)`, `SITE_URL`
- Üretir:
  - `duyuruYayinla(formData: FormData): Promise<never>`
  - `duyuruGuncelle(formData: FormData): Promise<never>`
  - `duyuruSil(formData: FormData): Promise<never>`
  - `export type DuyuruSonuc` — sonuç kodlarının listesi. Görev 4 kendi
    eşleme tablosunu `Record<string, …>` olarak kurar; tipi içe aktarması
    **gerekmez** (`'use server'` dosyasından tip almak çalışır ama gereksiz
    bağ kurar). İki liste elle aynı tutulur.

- [ ] **Adım 1: Dosyayı yaz**

```ts
'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { checkUserRateLimit } from '@/lib/rate-limit'
import { duyuruSchema } from '@/lib/validations'
import { sendChunkedEmail, escapeHtml } from '@/lib/email'
import { SITE_URL } from '@/lib/site'

const PARCA_BOYU = 5
const PARCALAR_ARASI_MS = 1000
const ANLIK_ALICI_TAVANI = 100
const GUNLUK_DUYURU_SINIRI = 3

/**
 * Sonuç kodları. Serbest METİN DEĞİL: `?sonuc=` adres çubuğundan geliyor,
 * yani bağlantıyı kuran kişi doldurabilir. Metin gönderseydik biri
 * organizatöre kendi yazdığı bir "sistem mesajını" gösterebilirdi.
 * (QR turunda kapatılan içerik sahteciliği vektörünün aynısı.)
 */
export type DuyuruSonuc =
  | 'yayinlandi' | 'alicisiz' | 'cok_uye' | 'guncellendi' | 'silindi'
  | 'posta_hatasi' | 'limit' | 'gecersiz' | 'yetkisiz' | 'gunluk' | 'kaydedilemedi'

/**
 * Action sonucunu kullanıcıya taşır: `<form action={fn}>` deseninde dönüş
 * değeri kullanıcıya ULAŞMAZ. redirect() istisna fırlatır — try/catch'e alma.
 */
function sonuc(communityId: string, kod: DuyuruSonuc): never {
  redirect(`/community/${encodeURIComponent(communityId)}/duyuru?sonuc=${kod}`)
}

export async function duyuruYayinla(formData: FormData): Promise<never> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rawId = String(formData.get('community_id') ?? '')

  if (!(await checkUserRateLimit(user.id, 'normal'))) {
    sonuc(rawId, 'limit')
  }

  const parsed = duyuruSchema.safeParse({
    community_id: rawId,
    title: formData.get('title'),
    body: formData.get('body'),
  })
  if (!parsed.success) sonuc(rawId, 'gecersiz')

  const { community_id, title, body } = parsed.data

  const { data: yetkili } = await supabase.rpc('topluluk_yoneticisi_mi', {
    p_community_id: community_id,
  })
  if (!yetkili) sonuc(community_id, 'yetkisiz')

  // Günlük sınır. Sayım satırlara bakıyor: yönetici duyurularını silerek
  // sınırı aşabilir. Bilinçli kabul — amaç kötü niyetliyi durdurmak değil,
  // dalgınlıkla üyelerin gelen kutusunu doldurmayı engellemek.
  const birGunOnce = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: bugunkuler } = await supabase
    .from('community_announcements')
    .select('id', { count: 'exact', head: true })
    .eq('community_id', community_id)
    .gte('created_at', birGunOnce)
  if ((bugunkuler ?? 0) >= GUNLUK_DUYURU_SINIRI) sonuc(community_id, 'gunluk')

  const { data: duyuru, error: yazmaHatasi } = await supabase
    .from('community_announcements')
    .insert({ community_id, author_id: user.id, title, body })
    .select('id')
    .single()

  if (yazmaHatasi || !duyuru) {
    console.error('[duyuru] kaydedilemedi:', yazmaHatasi)
    sonuc(community_id, 'kaydedilemedi')
  }

  // Alıcılar: RPC hem founder/admin doğrulaması yapıyor hem de
  // email_izni(user,'announcement') ile süzüyor. Yazarın kendisi hariç.
  const { data: emailRows, error: aliciHatasi } = await supabase.rpc('get_member_emails', {
    p_community_id: community_id,
    p_exclude: user.id,
  })
  if (aliciHatasi) {
    console.error('[duyuru] alici listesi alinamadi:', aliciHatasi)
    revalidatePath(`/community/${community_id}`)
    sonuc(community_id, 'posta_hatasi')
  }

  const alicilar = (emailRows ?? []) as string[]
  revalidatePath(`/community/${community_id}`)
  revalidatePath(`/community/${community_id}/duyuru`)

  if (alicilar.length === 0) sonuc(community_id, 'alicisiz')

  const { data: topluluk } = await supabase
    .from('communities').select('name').eq('id', community_id).single()
  const { data: yazar } = await supabase
    .from('profiles').select('name').eq('id', user.id).single()

  const html = duyuruHtml({
    baslik: title,
    metin: body,
    topluluk: topluluk?.name ?? 'Topluluk',
    yazar: yazar?.name ?? 'Bir yönetici',
    communityId: community_id,
  })
  const konu = `${topluluk?.name ?? 'Topluluk'} — duyuru`

  // Tavanın üstünde istek içinde gönderemeyiz (60 sn fonksiyon tavanı).
  //
  // Spec'te bir kuyruk yedeği öngörülmüştü, KESİLDİ: cron'daki buildMail
  // yalnızca 'reminder', 'promotion' ve 'join_request' şablonlarını tanıyor,
  // başkasında null dönüyor. Yani kuyruğa yazılan 'announcement' satırları
  // hiçbir zaman gönderilmez, üstelik sessizce. Çalışır hâle getirmek cron'u
  // -- platformun en hassas zamanlanmış işini -- değiştirmeyi gerektiriyordu.
  // Bugün hiçbir topluluk bu tavanın yakınında değil (en kalabalığı bir avuç
  // kişi), yani bozuk bir yedek yerine tanımlı bir ret daha dürüst.
  //
  // Bir topluluk tavana yaklaşırsa yapılacak iş: buildMail'e 'announcement'
  // dalı ekle (payload'da title/body/community_name taşı), sonra burayı
  // kuyruğa yazacak şekilde geri aç.
  if (alicilar.length > ANLIK_ALICI_TAVANI) {
    console.error(
      `[duyuru] alici sayisi tavani asti (${alicilar.length} > ${ANLIK_ALICI_TAVANI}), posta gonderilmedi:`,
      community_id
    )
    sonuc(community_id, 'cok_uye')
  }

  const { gonderildi } = await sendChunkedEmail(
    { to: alicilar, subject: konu, html },
    'duyuru/topluluk-duyurusu',
    { parcaBoyu: PARCA_BOYU, bekleMs: PARCALAR_ARASI_MS }
  )

  await supabase
    .from('community_announcements')
    .update({ sent_count: gonderildi })
    .eq('id', duyuru.id)

  revalidatePath(`/community/${community_id}/duyuru`)
  if (gonderildi === 0) sonuc(community_id, 'posta_hatasi')
  sonuc(community_id, 'yayinlandi')
}

export async function duyuruGuncelle(formData: FormData): Promise<never> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rawId = String(formData.get('community_id') ?? '')
  const duyuruId = String(formData.get('duyuru_id') ?? '')

  if (!(await checkUserRateLimit(user.id, 'normal'))) sonuc(rawId, 'limit')

  const parsed = duyuruSchema.safeParse({
    community_id: rawId,
    title: formData.get('title'),
    body: formData.get('body'),
  })
  if (!parsed.success) sonuc(rawId, 'gecersiz')

  const { community_id, title, body } = parsed.data

  const { data: yetkili } = await supabase.rpc('topluluk_yoneticisi_mi', {
    p_community_id: community_id,
  })
  if (!yetkili) sonuc(community_id, 'yetkisiz')

  // Düzenleme yeniden POSTA GÖNDERMEZ: giden posta gitmiştir (spec K4).
  const { error } = await supabase
    .from('community_announcements')
    .update({ title, body, updated_at: new Date().toISOString() })
    .eq('id', duyuruId)

  if (error) {
    console.error('[duyuru] guncellenemedi:', error)
    sonuc(community_id, 'kaydedilemedi')
  }

  revalidatePath(`/community/${community_id}`)
  revalidatePath(`/community/${community_id}/duyuru`)
  sonuc(community_id, 'guncellendi')
}

export async function duyuruSil(formData: FormData): Promise<never> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const communityId = String(formData.get('community_id') ?? '')
  const duyuruId = String(formData.get('duyuru_id') ?? '')

  if (!(await checkUserRateLimit(user.id, 'normal'))) sonuc(communityId, 'limit')

  const { data: yetkili } = await supabase.rpc('topluluk_yoneticisi_mi', {
    p_community_id: communityId,
  })
  if (!yetkili) sonuc(communityId, 'yetkisiz')

  const { error } = await supabase
    .from('community_announcements')
    .delete()
    .eq('id', duyuruId)

  if (error) {
    console.error('[duyuru] silinemedi:', error)
    sonuc(communityId, 'kaydedilemedi')
  }

  revalidatePath(`/community/${communityId}`)
  revalidatePath(`/community/${communityId}/duyuru`)
  sonuc(communityId, 'silindi')
}

/** app/api/event/route.ts'teki serif şablonun aynısı. Her değişken kaçırılır. */
function duyuruHtml({
  baslik, metin, topluluk, yazar, communityId,
}: {
  baslik: string; metin: string; topluluk: string; yazar: string; communityId: string
}): string {
  const b = escapeHtml(baslik)
  const t = escapeHtml(topluluk)
  const y = escapeHtml(yazar)
  // Satır sonları korunsun: kaçırdıktan SONRA <br> koyuyoruz.
  const m = escapeHtml(metin).replace(/\n/g, '<br />')
  const adres = `${SITE_URL}/community/${communityId}`

  return `
    <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
      <p style="font-style: italic; color: #B8541A;">${t}</p>
      <h1 style="color: #1F4A3D; font-weight: 500; font-size: 1.5rem;">${b}</h1>
      <p style="color: #1F2A24; line-height: 1.6;">${m}</p>
      <p style="font-style: italic; color: #1F2A24; opacity: 0.6; margin-top: 2rem;">
        <em>${y}</em> yazdı
      </p>
      <p style="margin-top: 1.5rem;">
        <a href="${adres}" style="color: #1F4A3D;">Topluluğun sayfasına git</a>
      </p>
      <p style="font-style: italic; color: #1F2A24; opacity: 0.6;">literas</p>
    </div>
  `
}
```

- [ ] **Adım 2: Doğrula ve commit**

```bash
npm run typecheck && npm run lint && npm run build
git add "app/community/[id]/duyuru/actions.ts"
git commit -m "duyurular: yayinlama, guncelleme ve silme action'lari"
```

---

## Görev 4: Liste sayfası + sonuç şeridi

**Dosyalar:**
- Oluştur: `app/community/[id]/duyuru/page.tsx`

**Arayüzler:**
- Tüketir: `DuyuruSonuc` ve `duyuruSil` (Görev 3), `topluluk_yoneticisi_mi` (Görev 1),
  `AyarlarDurum` `mesaj` prop'u (Görev 2), `formatDateTimeShort` (`lib/date.ts`)
- Üretir: `/community/[id]/duyuru` rotası

- [ ] **Adım 1: Sayfayı yaz**

```tsx
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDateTimeShort } from '@/lib/date'
import AyarlarDurum from '@/components/ayarlar-durum'

// Kod→metin eşlemesi. Action serbest metin değil KOD gönderiyor; metni burası
// seçiyor ki adres çubuğundan uydurma mesaj gösterilemesin.
const SONUC: Record<string, { metin: string; hataMi: boolean }> = {
  yayinlandi:    { metin: 'Duyuru yayınlandı ve üyelere gönderildi.', hataMi: false },
  alicisiz:      { metin: 'Duyuru yayınlandı. E-posta bildirimi açık üye yok.', hataMi: false },
  cok_uye:       { metin: 'Duyuru yayınlandı ama üye sayısı tek seferde e-posta göndermek için fazla. Sayfada görünüyor.', hataMi: true },
  guncellendi:   { metin: 'Duyuru güncellendi. Gönderilmiş e-posta değişmedi.', hataMi: false },
  silindi:       { metin: 'Duyuru silindi.', hataMi: false },
  posta_hatasi:  { metin: 'Duyuru yayınlandı ama e-posta gönderilemedi.', hataMi: true },
  limit:         { metin: 'Çok fazla istek, biraz bekle', hataMi: true },
  gecersiz:      { metin: 'Başlık 3-120, metin 10-3000 karakter olmalı', hataMi: true },
  yetkisiz:      { metin: 'Bu toplulukta duyuru yayınlama yetkin yok', hataMi: true },
  gunluk:        { metin: 'Bu topluluk bugün 3 duyuru gönderdi, yarın tekrar dene', hataMi: true },
  kaydedilemedi: { metin: 'Kaydedilemedi, lütfen tekrar dene', hataMi: true },
}

export default async function DuyuruListesi({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ sonuc?: string }>
}) {
  const { id } = await params
  const { sonuc } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(`/community/${id}/duyuru`)}`)

  const kayit = sonuc ? SONUC[sonuc] : undefined

  const { data: topluluk } = await supabase
    .from('communities').select('name').eq('id', id).single()

  const { data: yonetici } = await supabase.rpc('topluluk_yoneticisi_mi', {
    p_community_id: id,
  })

  // RLS zaten onaylı olmayan üyeye boş döndürür; ayrıca üye olup olmadığını
  // bilmek için bölümü hiç göstermemek gerekiyor.
  const { data: duyurular, error } = await supabase
    .from('community_announcements')
    .select('id, title, body, created_at, updated_at, sent_count')
    .eq('community_id', id)
    .order('created_at', { ascending: false })

  if (error) console.error('[duyuru] liste sorgusu:', error)

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px 80px' }}>
      <div style={{ font: "500 12px 'IBM Plex Mono', monospace", letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'lowercase' }}>
        {topluluk?.name ?? 'topluluk'}
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', margin: '6px 0 18px' }}>
        Duyurular
      </h1>

      {kayit && (
        <AyarlarDurum
          durum={kayit.hataMi ? undefined : 'ok'}
          hata={kayit.hataMi ? kayit.metin : undefined}
          mesaj={kayit.hataMi ? undefined : kayit.metin}
        />
      )}

      {yonetici && (
        <Link href={`/community/${id}/duyuru/yeni`} className="btn-primary btn-sm">
          Duyuru yaz
        </Link>
      )}

      {error && (
        <p style={{ marginTop: 20, fontSize: 15, color: 'var(--muted)' }}>
          Duyurular yüklenemedi, az sonra tekrar dene.
        </p>
      )}

      {!error && (duyurular?.length ?? 0) === 0 && (
        <p style={{ marginTop: 20, fontSize: 15, color: 'var(--muted)' }}>
          Henüz duyuru yok.
        </p>
      )}

      <div style={{ marginTop: 24 }}>
        {duyurular?.map((d) => (
          <article key={d.id} style={{ padding: '18px 0', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>{d.title}</h2>
            <div style={{ font: "500 12px 'IBM Plex Mono', monospace", color: 'var(--muted)', marginBottom: 8 }}>
              {formatDateTimeShort(d.created_at)}
              {d.updated_at ? ' · düzenlendi' : ''}
              {yonetici ? ` · ${d.sent_count} kişiye ulaştı` : ''}
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{d.body}</p>
            {yonetici && (
              <Link
                href={`/community/${id}/duyuru/${d.id}/duzenle`}
                style={{ display: 'inline-block', marginTop: 10, fontSize: 13.5, color: 'var(--muted)' }}
              >
                düzenle
              </Link>
            )}
          </article>
        ))}
      </div>

      <Link href={`/community/${id}`} style={{ marginTop: 26, display: 'inline-block', color: 'var(--muted)' }}>
        ← topluluğa dön
      </Link>
    </main>
  )
}
```

- [ ] **Adım 2: Doğrula ve commit**

```bash
npm run typecheck && npm run lint && npm run build
git add "app/community/[id]/duyuru/page.tsx"
git commit -m "duyurular: tum duyurular listesi ve sonuc seridi"
```

---

## Görev 5: Yazma ve düzenleme sayfaları

**Dosyalar:**
- Oluştur: `app/community/[id]/duyuru/yeni/page.tsx`
- Oluştur: `app/community/[id]/duyuru/[duyuruId]/duzenle/page.tsx`

**Arayüzler:**
- Tüketir: `duyuruYayinla`, `duyuruGuncelle`, `duyuruSil` (Görev 3);
  `topluluk_yoneticisi_mi` (Görev 1)
- Üretir: `/community/[id]/duyuru/yeni` ve
  `/community/[id]/duyuru/[duyuruId]/duzenle` rotaları

Her iki sayfa da en başta `topluluk_yoneticisi_mi` kapısından geçer. RLS ikinci
kapıdır, tek kapı değil — QR turunda sayfa kapısının unutulması gerçek bir
açığa yol açmıştı.

- [ ] **Adım 1: Yazma sayfasını yaz**

```tsx
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { duyuruYayinla } from '../actions'

export default async function YeniDuyuru({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(`/community/${id}/duyuru/yeni`)}`)

  const { data: yonetici } = await supabase.rpc('topluluk_yoneticisi_mi', {
    p_community_id: id,
  })
  if (!yonetici) {
    return (
      <main style={sayfaStil}>
        <h1 style={baslikStil}>Yetkin yok</h1>
        <p style={altStil}>Bu toplulukta duyuru yayınlama yetkin yok.</p>
      </main>
    )
  }

  const { data: topluluk } = await supabase
    .from('communities').select('name').eq('id', id).single()

  // Tahmini alıcı sayısı: kesin sayı gönderimden sonra sent_count'ta olacak.
  // get_member_emails bildirimi kapatmış üyeleri süzdüğü için bu sayı üst sınır.
  const { count: uyeSayisi } = await supabase
    .from('community_members')
    .select('id', { count: 'exact', head: true })
    .eq('community_id', id)
    .eq('status', 'approved')
    .neq('user_id', user.id)

  return (
    <main style={sayfaStil}>
      <div style={ustBilgiStil}>{topluluk?.name ?? 'topluluk'}</div>
      <h1 style={baslikStil}>Duyuru yaz</h1>
      <p style={altStil}>
        Bu duyuru en fazla <strong>{uyeSayisi ?? 0} üyeye</strong> e-posta olarak
        gidecek. Bildirimlerini kapatmış üyelere gönderilmez.
      </p>

      <form action={duyuruYayinla} style={{ marginTop: 22 }}>
        <input type="hidden" name="community_id" value={id} />

        <label style={etiketStil} htmlFor="title">Başlık</label>
        <input id="title" name="title" required minLength={3} maxLength={120} style={girdiStil} />

        <label style={etiketStil} htmlFor="body">Duyuru</label>
        <textarea id="body" name="body" required minLength={10} maxLength={3000} rows={9} style={{ ...girdiStil, resize: 'vertical' }} />

        <button type="submit" className="btn-primary" style={{ marginTop: 18 }}>
          Yayınla ve gönder
        </button>
      </form>

      <Link href={`/community/${id}/duyuru`} style={{ marginTop: 22, display: 'inline-block', color: 'var(--muted)' }}>
        ← duyurulara dön
      </Link>
    </main>
  )
}

const sayfaStil = { maxWidth: 640, margin: '0 auto', padding: '48px 24px 80px' } as const
const baslikStil = { fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', margin: '6px 0 10px' } as const
const altStil = { fontSize: 15, lineHeight: 1.6, color: 'var(--muted)', margin: 0 } as const
const ustBilgiStil = {
  font: "500 12px 'IBM Plex Mono', monospace",
  letterSpacing: '0.08em',
  color: 'var(--muted)',
  textTransform: 'lowercase',
} as const
const etiketStil = { display: 'block', fontSize: 13.5, fontWeight: 700, margin: '16px 0 6px' } as const
const girdiStil = {
  width: '100%',
  padding: '11px 14px',
  border: '1.5px solid var(--border)',
  borderRadius: 12,
  fontSize: 15,
  fontFamily: 'inherit',
  background: 'var(--paper-cream)',
  color: 'var(--ink)',
} as const
```

- [ ] **Adım 2: Düzenleme sayfasını yaz**

`app/community/[id]/duyuru/[duyuruId]/duzenle/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { duyuruGuncelle, duyuruSil } from '../../actions'

export default async function DuyuruDuzenle({
  params,
}: {
  params: Promise<{ id: string; duyuruId: string }>
}) {
  const { id, duyuruId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/community/${id}/duyuru/${duyuruId}/duzenle`)}`)
  }

  const { data: yonetici } = await supabase.rpc('topluluk_yoneticisi_mi', {
    p_community_id: id,
  })
  if (!yonetici) {
    return (
      <main style={sayfaStil}>
        <h1 style={baslikStil}>Yetkin yok</h1>
        <p style={altStil}>Bu toplulukta duyuru düzenleme yetkin yok.</p>
      </main>
    )
  }

  const { data: duyuru } = await supabase
    .from('community_announcements')
    .select('id, title, body, community_id')
    .eq('id', duyuruId)
    .maybeSingle()

  if (!duyuru || duyuru.community_id !== id) {
    return (
      <main style={sayfaStil}>
        <h1 style={baslikStil}>Duyuru bulunamadı</h1>
        <p style={altStil}>Bu duyuru silinmiş ya da bu topluluğa ait değil.</p>
      </main>
    )
  }

  return (
    <main style={sayfaStil}>
      <h1 style={baslikStil}>Duyuruyu düzenle</h1>
      <p style={altStil}>
        <strong>Düzenleme, gönderilmiş e-postayı değiştirmez.</strong> Değişiklik
        yalnızca bu sayfada görünür ve yeniden e-posta gönderilmez.
      </p>

      <form action={duyuruGuncelle} style={{ marginTop: 22 }}>
        <input type="hidden" name="community_id" value={id} />
        <input type="hidden" name="duyuru_id" value={duyuru.id} />

        <label style={etiketStil} htmlFor="title">Başlık</label>
        <input id="title" name="title" defaultValue={duyuru.title} required minLength={3} maxLength={120} style={girdiStil} />

        <label style={etiketStil} htmlFor="body">Duyuru</label>
        <textarea id="body" name="body" defaultValue={duyuru.body} required minLength={10} maxLength={3000} rows={9} style={{ ...girdiStil, resize: 'vertical' }} />

        <button type="submit" className="btn-primary" style={{ marginTop: 18 }}>
          Kaydet
        </button>
      </form>

      <form action={duyuruSil} style={{ marginTop: 26 }}>
        <input type="hidden" name="community_id" value={id} />
        <input type="hidden" name="duyuru_id" value={duyuru.id} />
        <button type="submit" className="btn-secondary" style={{ fontSize: 13.5, padding: '8px 18px' }}>
          Duyuruyu sil
        </button>
      </form>

      <Link href={`/community/${id}/duyuru`} style={{ marginTop: 22, display: 'inline-block', color: 'var(--muted)' }}>
        ← duyurulara dön
      </Link>
    </main>
  )
}

const sayfaStil = { maxWidth: 640, margin: '0 auto', padding: '48px 24px 80px' } as const
const baslikStil = { fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', margin: '6px 0 10px' } as const
const altStil = { fontSize: 15, lineHeight: 1.6, color: 'var(--muted)', margin: 0 } as const
const etiketStil = { display: 'block', fontSize: 13.5, fontWeight: 700, margin: '16px 0 6px' } as const
const girdiStil = {
  width: '100%',
  padding: '11px 14px',
  border: '1.5px solid var(--border)',
  borderRadius: 12,
  fontSize: 15,
  fontFamily: 'inherit',
  background: 'var(--paper-cream)',
  color: 'var(--ink)',
} as const
```

- [ ] **Adım 3: Doğrula ve commit**

```bash
npm run typecheck && npm run lint && npm run build
git add "app/community/[id]/duyuru/yeni" "app/community/[id]/duyuru/[duyuruId]"
git commit -m "duyurular: yazma ve duzenleme sayfalari"
```

---

## Görev 6: Topluluk sayfasındaki bölüm

**Dosyalar:**
- Oluştur: `app/community/[id]/duyurular.tsx`
- Değiştir: `app/community/[id]/page.tsx`

**Arayüzler:**
- Tüketir: `formatDateTimeShort` (`lib/date.ts`)
- Üretir: `<Duyurular communityId={string} yonetici={boolean} />`

- [ ] **Adım 1: Bölüm bileşenini yaz**

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { formatDateTimeShort } from '@/lib/date'

const GOSTERILEN = 5

/**
 * Topluluk sayfasındaki "Duyurular" bölümü.
 *
 * Yalnızca onaylı üyeye render edilir (çağıran taraf karar verir). RLS de
 * aynı kuralı uyguluyor; bu ikinci kapı, tek kapı değil.
 */
export default async function Duyurular({
  communityId, yonetici,
}: {
  communityId: string
  yonetici: boolean
}) {
  const supabase = await createClient()

  const { data: duyurular, error } = await supabase
    .from('community_announcements')
    .select('id, title, body, created_at')
    .eq('community_id', communityId)
    .order('created_at', { ascending: false })
    .limit(GOSTERILEN + 1)

  if (error) console.error('[duyuru] bolum sorgusu:', error)

  const gosterilecek = (duyurular ?? []).slice(0, GOSTERILEN)
  const dahaVar = (duyurular?.length ?? 0) > GOSTERILEN

  return (
    <section className="cp-block">
      <h2 className="cp-h2">Duyurular</h2>

      {yonetici && (
        <Link href={`/community/${communityId}/duyuru/yeni`} className="btn-primary btn-sm">
          Duyuru yaz
        </Link>
      )}

      {error && (
        <div className="cp-empty"><p>Duyurular yüklenemedi, az sonra tekrar dene.</p></div>
      )}

      {!error && gosterilecek.length === 0 && (
        <div className="cp-empty"><p>Henüz duyuru yok.</p></div>
      )}

      <div style={{ marginTop: 14 }}>
        {gosterilecek.map((d) => (
          <article key={d.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 2 }}>{d.title}</div>
            <div style={{ font: "500 12px 'IBM Plex Mono', monospace", color: 'var(--muted)', marginBottom: 6 }}>
              {formatDateTimeShort(d.created_at)}
            </div>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{d.body}</p>
          </article>
        ))}
      </div>

      {(dahaVar || gosterilecek.length > 0) && (
        <Link
          href={`/community/${communityId}/duyuru`}
          style={{ display: 'inline-block', marginTop: 14, fontSize: 13.5, color: 'var(--muted)' }}
        >
          tüm duyurular →
        </Link>
      )}
    </section>
  )
}
```

- [ ] **Adım 2: Topluluk sayfasına yerleştir**

`app/community/[id]/page.tsx`:

1. Importlara ekle (dosyanın üst kısmındaki diğer yerel importların yanına):

```tsx
import Duyurular from './duyurular'
```

2. `canModerate` tanımının hemen altına (158. satır civarı) onaylı üyelik
   değişkenini ekle — dosyada böyle bir değişken **yok**, `canModerate`
   yalnızca founder/admin'i kapsıyor:

```tsx
const isApprovedMember = currentUserMembership?.status === 'approved'
```

3. `<section className="cp-block"><h2 className="cp-h2">Etkinlikler</h2>`
   bloğunun **hemen ÜSTÜNE** (304. satır civarı) ekle:

```tsx
{isApprovedMember && (
  <Duyurular communityId={community.id} yonetici={canModerate} />
)}
```

Duyurular etkinliklerin üstünde durur: zamana duyarlıdırlar ("bu akşam salon
değişti") ve üyenin ilk göreceği şey olmalıdır.

- [ ] **Adım 3: Doğrula ve commit**

```bash
npm run typecheck && npm run lint && npm run build
git add "app/community/[id]/duyurular.tsx" "app/community/[id]/page.tsx"
git commit -m "duyurular: topluluk sayfasindaki bolum"
```

---

## Görev 7: Baseline şema ve belgeler

**Dosyalar:**
- Değiştir: `supabase/schema.sql`
- Değiştir: `literas-yol-haritasi.md`
- Değiştir: `CLAUDE.md`

- [ ] **Adım 1: `supabase/schema.sql`'i güncelle**

Canlıdan oku, tahmin etme. `execute_sql` ile fonksiyon gövdesini ve
politikaları çek, baseline'a birebir yaz:

```sql
select pg_get_functiondef(p.oid) from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='topluluk_yoneticisi_mi';

select polname, polcmd,
       pg_get_expr(polqual, polrelid)      as using_ifadesi,
       pg_get_expr(polwithcheck, polrelid) as check_ifadesi
from pg_policy p join pg_class c on c.oid=p.polrelid
where c.relname='community_announcements';
```

Baseline'a eklenecekler, dosyanın mevcut bölüm düzenine uyarak:
tablo (4. bölüm), index (6. bölüm), fonksiyon (7. bölüm), RLS politikaları
(ilgili bölüm), yetkiler (12. bölüm).

**DİKKAT:** `community_announcements`'ı toplu
`GRANT INSERT, UPDATE, DELETE ON TABLE ... TO authenticated` listelerine
**EKLEME**. Kolon bazlı yetki tablo bazlı GRANT'i ezmez; listeye eklenirse
`created_at` ve `community_id` korumaları sessizce anlamsızlaşır. Ayrı
satırlarda, Görev 1'deki biçimiyle yaz.

- [ ] **Adım 2: Baseline'ın canlıyla eşleştiğini doğrula**

```sql
select
  (select count(*) from information_schema.columns
   where table_schema='public' and table_name='community_announcements') as kolon_sayisi,
  (select count(*) from pg_policy p join pg_class c on c.oid=p.polrelid
   where c.relname='community_announcements') as politika_sayisi;
```

Aynı sayıları `supabase/schema.sql` içinde `grep` ile doğrula: 8 kolon,
4 politika.

- [ ] **Adım 3: Yol haritasını işaretle**

`literas-yol-haritasi.md` içinde `- [ ] Topluluk duyuruları` satırını `- [x]`
yap ve altına ne yapıldığını yaz: tablo ve RLS, `topluluk_yoneticisi_mi`,
`get_member_emails`'in yeniden kullanıldığı (izin kapısı için yeni kod
yazılmadığı), anında-ama-parçalı gönderim kararı ve **neden kuyruk
seçilmediği** (Hobby'de cron günde bir kez), kapsam dışı bırakılanlar.

- [ ] **Adım 4: `CLAUDE.md`'yi güncelle**

Yol haritası özetindeki Aşama 3 satırında "Topluluk duyuruları"nı ✓ ile
işaretle. Ayrıca "Dizin haritası" bölümüne `app/community/[id]/duyuru/`
satırını ekle. Başka hiçbir yerine dokunma.

- [ ] **Adım 5: Doğrula ve commit**

```bash
npm run typecheck && npm run lint && npm run build
git add supabase/schema.sql literas-yol-haritasi.md CLAUDE.md
git commit -m "duyurular: baseline sema ve belgeler"
```

---

## Uygulama sonrası canlı doğrulama

Dal birleşip dağıtım `READY` olduktan sonra:

1. Üye olmayan bir kullanıcıyla `/community/<id>/duyuru` açılır — duyuru
   içeriği **görünmemeli**.
2. Giriş yapmamış bir istekle aynı adres `/login`'e yönlendirmeli ve `next`
   parametresi **kodlanmış** olmalı.
3. Yönetici hesabıyla bir duyuru yayınlanır; `sent_count` sıfırdan büyük
   olmalı ve posta gerçekten düşmeli.
