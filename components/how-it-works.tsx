import { RolyefKahve, RolyefKap } from '@/components/rolyef'

/**
 * "Nasıl çalışır" — referansın "What you should bring" listesinin dili.
 *
 * ESKİ HÂLİ: yan yana ÜÇ EŞİT KART, ortalarında oklar. İki sorun vardı.
 *   1. Referansta böyle bir blok YOK. Ölçüm sayfada 20 adet "hap satırı"
 *      buldu (#E8E8E8 zemin, 4px köşe, 8px 4px 3px dolgu, 13px yükseklik):
 *      solda Roma rakamı, sağda öğe adı. Liste dili bu.
 *   2. "Üç eşit özellik kartı yan yana" taste-skill'de açıkça yasaklı
 *      bir kalıp; LLM tasarımının en tanınan imzalarından.
 *
 * Rölyefler çöpe gitmedi: hücreyi dolduran sessiz illüstrasyon olarak
 * kaldılar, referansın kendi hücre düzeni de böyle.
 */

type Step = { no: string; title: string; body: string }

const STEPS: Step[] = [
  { no: 'I',   title: 'Bir masa aç',      body: 'Konu, şehir, isim. Topluluk kurmak iki dakika sürer.' },
  { no: 'II',  title: 'Buluşmayı planla', body: 'Tarih ve yer gir. Bağlantıyı paylaş, katılımı gör.' },
  { no: 'III', title: 'Tanışın',          body: 'İnsanlar gelir. Gerisi kahvenin işi.' },
]

export default function HowItWorks() {
  return (
    <div className="hw">
      <ol className="hw-list" role="list">
        {STEPS.map((s) => (
          <li key={s.no} className="hw-row reveal">
            <span className="hw-no" aria-hidden="true">{s.no}</span>
            <span className="hw-title">{s.title}</span>
            <span className="hw-body">{s.body}</span>
          </li>
        ))}
      </ol>

      {/* Kahve, masa DEĞİL: tam masa ilk kez kapanışta (V) görünmeli; hücrenin
          kendi metni de "gerisi kahvenin işi". */}
      <RolyefKap cizim={RolyefKahve} konum="sag-alt" olcek={0.5} opaklik={0.1} />

      <style>{`
        .hw {
          position: relative;
          overflow: hidden;
          background: var(--paper-cream);
          border-radius: var(--r-md);
          padding: var(--s-6) var(--s-5);
        }
        .hw-list {
          position: relative;
          z-index: 1;
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 4px;              /* ölçüm: satırlar bitişik, aralarında 4px */
        }
        /* Hap satırı: referansın ölçülen değerleri. */
        .hw-row {
          display: grid;
          grid-template-columns: 40px minmax(0, 200px) minmax(0, 1fr);
          gap: var(--s-4);
          align-items: baseline;
          background: var(--panel);
          border-radius: var(--r-md);
          padding: 10px 14px;
        }
        .hw-no {
          font-family: var(--font-serif), Georgia, serif;
          font-size: 14px;
          color: var(--muted);
        }
        .hw-title {
          font-family: var(--font-serif), Georgia, serif;
          font-size: 16px;
          letter-spacing: .02em;
          color: var(--ink);
        }
        .hw-body {
          font-size: 16px;
          color: var(--ink);
          line-height: 1.5;
        }

        @media (max-width: 760px) {
          .hw { padding: var(--s-5) var(--s-4); }
          .hw-row {
            grid-template-columns: 32px minmax(0, 1fr);
            gap: 4px var(--s-3);
            padding: 10px 12px;
          }
          .hw-body { grid-column: 2; }
        }
      `}</style>
    </div>
  )
}
