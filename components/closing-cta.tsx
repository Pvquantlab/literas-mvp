import Link from 'next/link'
import { RolyefMasa } from '@/components/rolyef'

/**
 * Sayfa sonu — dokunan çizgiler.
 *
 * Altı eğri ayrı ayrı akıp birbirini kesiyor: sitenin kendi cümlesinin
 * görsel karşılığı ("insanlardan topluluklar"). Renkler spektrumun beşi
 * artı bir açık mavi.
 *
 * Eğriler sinüsten türetilip Catmull-Rom ile kübik beziere çevrildi —
 * elle yazılmış kontrol noktalarında dalgalar düzensiz kalıyordu.
 *
 * Bu bölüm eski lacivert CTA bandının YERİNE geçti; ikisi aynı işi
 * yapıyordu (topluluk kurmaya çağırmak).
 */
export default function ClosingCta() {
  return (
    <section className="cc">
      <div className="cc-inner reveal">
        <span className="cc-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32">
            <rect x="8.6" y="6" width="4.2" height="14" rx="2.1" fill="currentColor" />
            <rect x="8.6" y="20" width="14.8" height="4" rx="2" fill="currentColor" />
            <rect x="10" y="24" width="2.6" height="4" rx="1.3" fill="currentColor" />
            <rect x="19" y="24" width="2.6" height="4" rx="1.3" fill="currentColor" />
            <circle cx="18.8" cy="16.2" r="2.7" fill="var(--grad-1)" />
          </svg>
        </span>

        <h2 className="cc-title">Masayı sen kur</h2>
        <p className="cc-sub">
          Konu senden, masa bizden. İki dakikada kurulur, ilk buluşmayı bu hafta yapabilirsin.
        </p>

        {/* Sekiz kesişen dalga çizgisi buradaydı (3.2px kontur, üç mavi).
            Kaldırıldı: içeriği düzenlemeyen saf dekorasyondu ve referansta
            karşılığı yok. Yerine bölümün kendi metaforu geldi -- başlık
            zaten "Masayı sen kur". */}
        <span className="cc-rolyef" aria-hidden="true">
          <RolyefMasa />
        </span>

        <Link href="/community/new" className="cc-btn">
          Topluluk kur
          <span className="cc-dots" aria-hidden="true">
            <svg viewBox="0 0 22 22">
              <g fill="currentColor">
                <circle cx="6" cy="4" r="1.5" /><circle cx="12" cy="5" r="1.5" />
                <circle cx="17" cy="9" r="1.5" /><circle cx="17" cy="15" r="1.5" />
                <circle cx="12" cy="18" r="1.5" /><circle cx="6" cy="17" r="1.5" />
                <circle cx="4" cy="11" r="1.5" />
              </g>
            </svg>
          </span>
        </Link>
      </div>

      <style>{`
        .cc {
          position: relative;
          background-color: var(--paper-soft);
          background-image: radial-gradient(rgba(22, 22, 15, .16) 1px, transparent 1px);
          background-size: 17px 17px;
          border-top: 1px solid var(--border);
          padding: var(--s-8) var(--s-5) var(--s-7);
          overflow: hidden;
        }
        .cc-inner {
          position: relative;
          max-width: var(--w-page);
          margin: 0 auto;
          text-align: center;
        }
        .cc-mark {
          display: inline-block;
          width: 76px;
          color: var(--ink);
          margin-bottom: var(--s-4);
        }
        .cc-mark svg { width: 100%; height: auto; display: block; }

        .cc-title {
          /* Ağırlık en ince, harf aralığı POZİTİF, tavan 34px.
             DÜZELTME: serifi bir kez kaldırmıştım, yanlıştı. Ölçüm
             referansın 1919 metin düğümünün serif olduğunu gösterdi;
             ses o. Gövde artık Marcellus, bu başlık da onu izliyor.
             Renk sıcak siyahtan mürekkebe geçti: referansta siyah metin yok. */
          font-weight: 400;
          font-size: clamp(24px, 3vw, 34px);
          letter-spacing: .04em;
          line-height: 1.06;
          color: var(--ink);
          margin: 0;
        }
        .cc-sub {
          font-size: var(--t-md);
          color: var(--muted);
          max-width: 56ch;
          margin: var(--s-4) auto 0;
          line-height: 1.6;
        }

        /* Eğriler başlıkla buton arasında akıyor; negatif üst boşlukla
           metnin hemen altına giriyor, butonun altından geçiyor. */
        .cc-rolyef {
          display: block;
          width: clamp(220px, 30vw, 380px);
          margin: var(--s-6) auto calc(-1 * clamp(90px, 12vw, 150px));
          color: var(--ink);
          opacity: .13;
        }
        .cc-rolyef svg { width: 100%; height: auto; display: block; }

        .cc-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: var(--s-3);
          background: var(--ink);
          color: #fff;
          font-weight: 600;
          font-size: var(--t-md);
          padding: 14px 24px;
          border-radius: var(--r-pill);
          transition: transform .2s var(--ease), background .2s var(--ease);
        }
        .cc-btn:hover { color: #fff; background: var(--ink-hover); transform: translateY(-1px); }
        .cc-dots { width: 22px; color: var(--grad-1); }
        .cc-dots svg { width: 100%; height: auto; display: block; }

        @media (max-width: 640px) {
          .cc { padding: var(--s-7) var(--s-4) var(--s-6); }
          .cc-rolyef { margin-bottom: calc(-1 * var(--s-7)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cc-btn { transition: none; }
          .cc-btn:hover { transform: none; }
        }
      `}</style>
    </section>
  )
}
