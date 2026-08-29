import { RolyefMasa, RolyefSandalye, RolyefKahve } from '@/components/rolyef'
/**
 * "Nasıl çalışır" — kenarlıklı kutu, ikon sırası, aralarında oklar.
 *
 * Çerçevedeki sert ofset gölge sitenin eski imzasıydı; palet değişiminde
 * butonlardan kaldırılmıştı. Burada bölüm çerçevesi olarak geri geliyor.
 *
 * İkonlar sprite'tan gelmiyor: sprite KATEGORİ nesneleri taşıyor, buradaki
 * üçü EYLEM anlatıyor (masa aç / planla / tanış). Aynı 3D dille — üst yüz
 * açık, yan yüz koyu, altta gölge — ama ayrı çizildiler.
 *
 * Renkler spektrumu takip ediyor: turkuaz → mavi → magenta.
 */

type Step = { title: string; body: string; icon: React.ReactNode }

/** Rölyeflerin adım ikonu olarak ölçüsü. */
const rolyefStil = { width: 68, height: 68, color: 'var(--ink)' } as const

const STEPS: Step[] = [
  { title: 'Bir masa aç', body: 'Konu, şehir, isim. Topluluk kurmak iki dakika sürer.', icon: <RolyefSandalye style={rolyefStil} /> },
  { title: 'Buluşmayı planla', body: 'Tarih ve yer gir. Bağlantıyı paylaş, katılımı gör.', icon: <RolyefMasa style={rolyefStil} /> },
  { title: 'Tanışın', body: 'İnsanlar gelir. Gerisi kahvenin işi.', icon: <RolyefKahve style={rolyefStil} /> },
]

function Arrow() {
  return (
    <span className="hw-arrow" aria-hidden="true">
      <svg viewBox="0 0 34 24" fill="none">
        <path
          d="M2 9.5 H20 V3 L32 12 L20 21 V14.5 H2 Z"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

export default function HowItWorks() {
  return (
    <div className="hw">
      <ol className="hw-row">
        {STEPS.map((s, i) => (
          <li key={s.title} className="hw-cell">
            <div className="hw-step">
              <span className="hw-icon">{s.icon}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
            {i < STEPS.length - 1 && <Arrow />}
          </li>
        ))}
      </ol>

      <style>{`
        .hw {
          /* Çerçeve bir tur önce kaldırılmıştı ama 7px'lik SERT MÜREKKEP
             GÖLGESİ kalmıştı; ekranda en gürültülü öğelerden biriydi ve
             ölçüm referansta gölge taşıyan sıfır eleman buluyor.
             (Çift yazılmış background satırı da temizlendi.) */
          background: var(--paper-cream);
          border-radius: var(--r-md);
          padding: var(--s-7) var(--s-5);
        }
        .hw-row {
          list-style: none;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          gap: 0;
        }
        .hw-cell { display: flex; align-items: center; flex: 1 1 0; min-width: 0; }
        .hw-step { flex: 1 1 auto; text-align: center; padding: 0 var(--s-3); min-width: 0; }
        .hw-icon { display: block; width: clamp(72px, 9vw, 104px); margin: 0 auto var(--s-4); }
        .hw-icon svg { width: 100%; height: auto; display: block; }
        .hw-step h3 {
          font-family: var(--font-serif), Georgia, serif;
          font-size: var(--t-lg);
          font-weight: 400;         /* Marcellus'ta 700 yok: sahte kalın olurdu */
          color: var(--ink);
          margin: 0 0 var(--s-2);
          letter-spacing: .03em;
        }
        .hw-step p {
          font-size: var(--t-sm);
          color: var(--muted);
          line-height: 1.55;
          max-width: 30ch;
          margin: 0 auto;
        }
        .hw-arrow {
          flex: none;
          width: 34px;
          color: var(--coral);
          margin-top: clamp(30px, 4vw, 44px);
        }
        .hw-arrow svg { width: 100%; height: auto; display: block; }

        @media (max-width: 760px) {
          .hw { padding: var(--s-6) var(--s-4); }
          .hw-row { flex-direction: column; align-items: stretch; gap: var(--s-3); }
          .hw-cell { flex-direction: column; }
          .hw-arrow { margin: var(--s-2) 0 0; transform: rotate(90deg); }
        }
      `}</style>
    </div>
  )
}
