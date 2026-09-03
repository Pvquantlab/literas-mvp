import Link from 'next/link'
import { RolyefMasa } from '@/components/rolyef'

export const metadata = {
  title: 'Hakkında',
  description: 'literaslab nedir, neden var, kim için. Kısa cevap: insanların kendi masalarını kurduğu yer.',
}

/**
 * Hakkında — kapanış hücresinin "literaslab nedir →" bağlantısı buraya
 * geliyor. Eskiden "Yakında hikâye olacak" yer tutucusuydu; bir bağlantıyı
 * yer tutucuya götürmek sözü tutmamaktır.
 *
 * Dil: ana sayfanın afiş dili. Uzun kurumsal anlatı değil; kısa, somut,
 * kuru. Metafor bir kez daha: masa. Sayfanın tek görseli tam kurulu masa
 * (kademe 4) — hikâye "masa kuruldu" ile bitiyor.
 */
export default function HakkindaPage() {
  return (
    <main id="content" className="container-narrow" style={{ paddingTop: 'var(--s-7)', paddingBottom: 'var(--s-8)' }}>
      <span className="bolum-no" style={{ display: 'block', marginBottom: 12 }}>literaslab · hakkında</span>
      <h1 className="bolum-baslik" style={{ fontSize: 24 }}>İnsanların kendi masalarını kurduğu yer</h1>

      <div style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--ink)', marginTop: 'var(--s-5)', display: 'grid', gap: 'var(--s-4)', maxWidth: '58ch' }}>
        <p>
          Bir şehirde yaşarsın, bir şeyi seversin — kitap, yürüyüş, kahve,
          fotoğraf — ve onu seven başka insanlarla aynı masaya oturmak
          istersin. Bunun için bugün ya bir WhatsApp grubu ya bir Excel
          tablosu ya da pahalı, hantal bir platform var.
        </p>
        <p>
          literaslab bunun yerine geçiyor. Konuyu sen seçersin, masayı biz
          kurarız: topluluk iki dakikada açılır, buluşma tarih ve yerle
          duyurulur, kim geliyor kim gelmedi görünür, hatırlatma kendi gider.
          Ücretsiz. Kategorisi yok — ya da hepsi var: on dört başlık, hepsi
          eşit.
        </p>
        <p>
          İstanbul'da başladık. Türkçe konuşuyor: "İzmir'de" der, "İzmir'da"
          demez. Küçük bir şey; bizim için değil.
        </p>
      </div>

      <dl style={{ margin: 'var(--s-7) 0 0', display: 'grid', gap: 10, maxWidth: 420 }}>
        {[
          ['N', 'Ne', 'Genel amaçlı topluluk ve etkinlik platformu'],
          ['K', 'Kim için', 'Bir masa kurmak ya da birine oturmak isteyen herkes'],
          ['Ü', 'Ücret', 'Yok. Bir gün ücretli etkinlik olursa: düşük, tek kalem, şeffaf'],
          ['Ş', 'Şehir', 'İstanbul ile başladı; her şehir açık'],
        ].map(([h, ad, deger]) => (
          <div key={ad} style={{ display: 'grid', gridTemplateColumns: '20px 110px 1fr', gap: 12, alignItems: 'baseline', background: 'var(--panel)', borderRadius: 'var(--r-md)', padding: '10px 14px' }}>
            <dt className="bolum-no" style={{ color: 'var(--muted)' }}>{h}.</dt>
            <dd style={{ margin: 0, fontSize: 16 }}>{ad}</dd>
            <dd style={{ margin: 0, fontSize: 16 }}>{deger}</dd>
          </div>
        ))}
      </dl>

      <div style={{ position: 'relative', marginTop: 'var(--s-7)', padding: '28px 24px', background: 'var(--ink)', borderRadius: 'var(--r-md)', overflow: 'hidden', minHeight: 220, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <span className="masa-ciz" aria-hidden="true" style={{ color: 'var(--paper-cream)', opacity: .26, height: '150%', top: '-24%', right: '-10%' }}>
          <RolyefMasa asama={4} />
        </span>
        <p className="bolum-alt" style={{ color: 'var(--paper-cream)', margin: 0, position: 'relative', maxWidth: '40ch' }}>
          Masa kuruldu. Oturmak ya da kendininkini kurmak sana kalmış.
        </p>
        <div className="bolum-eylemler" style={{ position: 'relative' }}>
          <Link href="/kesfet" className="bolum-eylem dugme" style={{ background: 'var(--paper-cream)', color: 'var(--ink)' }}>Toplulukları gör →</Link>
          <Link href="/community/new" className="bolum-eylem" style={{ color: 'color-mix(in srgb, var(--paper-cream) 81%, transparent)' }}>Topluluk kur →</Link>
        </div>
      </div>
    </main>
  )
}
