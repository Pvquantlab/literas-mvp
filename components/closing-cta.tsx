import Link from 'next/link'

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
      <div className="cc-inner">
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

        <svg className="cc-lines" viewBox="0 0 1200 360" preserveAspectRatio="none" aria-hidden="true">
          <g fill="none" strokeWidth="3.2" strokeLinecap="round">
            <path d="M0 56.0 C14 57.4 57 60.9 86 64.4 C114 68.0 143 72.4 171 77.3 C200 82.1 229 87.7 257 93.5 C286 99.3 314 105.6 343 112.0 C371 118.4 400 125.2 429 131.9 C457 138.6 486 145.5 514 152.2 C543 158.9 571 165.6 600 172.0 C629 178.4 657 184.7 686 190.5 C714 196.3 743 201.9 771 206.9 C800 212.0 829 216.6 857 220.6 C886 224.6 914 228.2 943 231.0 C971 233.7 1000 235.9 1029 237.3 C1057 238.7 1086 239.4 1114 239.2 C1143 238.9 1186 236.5 1200 236.0" stroke="var(--obj-hi)" />
            <path d="M0 125.8 C14 127.0 57 129.9 86 132.9 C114 136.0 143 139.9 171 144.2 C200 148.4 229 153.4 257 158.5 C286 163.6 314 169.3 343 175.0 C371 180.7 400 186.7 429 192.7 C457 198.6 486 204.8 514 210.8 C543 216.7 571 222.8 600 228.5 C629 234.3 657 239.9 686 245.2 C714 250.5 743 255.6 771 260.3 C800 264.9 829 269.3 857 273.1 C886 276.9 914 280.3 943 283.1 C971 285.8 1000 288.1 1029 289.6 C1057 291.2 1086 292.1 1114 292.2 C1143 292.3 1186 290.5 1200 290.2" stroke="var(--obj-mid)" />
            <path d="M0 183.0 C14 182.3 57 180.9 86 179.0 C114 177.0 143 174.4 171 171.4 C200 168.4 229 164.7 257 160.8 C286 156.8 314 152.3 343 147.7 C371 143.1 400 138.0 429 132.9 C457 127.8 486 122.4 514 117.0 C543 111.7 571 106.2 600 100.9 C629 95.6 657 90.3 686 85.2 C714 80.2 743 75.3 771 70.7 C800 66.2 829 61.9 857 58.1 C886 54.3 914 50.8 943 47.9 C971 45.0 1000 42.5 1029 40.7 C1057 38.9 1086 37.6 1114 37.0 C1143 36.4 1186 37.0 1200 37.0" stroke="var(--obj-mid)" />
            <path d="M0 199.1 C14 198.2 57 195.5 86 193.7 C114 191.8 143 189.9 171 188.0 C200 186.2 229 184.3 257 182.5 C286 180.7 314 179.0 343 177.3 C371 175.7 400 174.2 429 172.8 C457 171.4 486 170.2 514 169.1 C543 168.1 571 167.2 600 166.5 C629 165.8 657 165.3 686 165.0 C714 164.8 743 164.7 771 164.8 C800 165.0 829 165.3 857 165.9 C886 166.5 914 167.2 943 168.2 C971 169.1 1000 170.3 1029 171.6 C1057 172.9 1086 174.3 1114 175.9 C1143 177.4 1186 180.1 1200 180.9" stroke="var(--obj-dk)" />
            <path d="M0 217.4 C14 215.9 57 212.1 86 208.6 C114 205.1 143 200.8 171 196.3 C200 191.7 229 186.6 257 181.4 C286 176.1 314 170.5 343 164.9 C371 159.3 400 153.4 429 147.7 C457 142.0 486 136.2 514 130.6 C543 125.1 571 119.6 600 114.4 C629 109.2 657 104.2 686 99.7 C714 95.1 743 90.8 771 87.0 C800 83.2 829 79.7 857 76.9 C886 74.0 914 71.5 943 69.7 C971 67.9 1000 66.7 1029 66.1 C1057 65.5 1086 65.5 1114 66.2 C1143 67.0 1186 69.9 1200 70.6" stroke="var(--obj-dk)" />
            <path d="M0 236.9 C14 236.7 57 235.9 86 235.9 C114 235.9 143 236.3 171 236.9 C200 237.5 229 238.5 257 239.7 C286 240.9 314 242.5 343 244.2 C371 246.0 400 248.1 429 250.3 C457 252.5 486 255.0 514 257.5 C543 260.1 571 262.8 600 265.6 C629 268.3 657 271.2 686 274.1 C714 276.9 743 279.8 771 282.5 C800 285.3 829 288.0 857 290.6 C886 293.1 914 295.6 943 297.8 C971 300.0 1000 302.0 1029 303.8 C1057 305.5 1086 307.1 1114 308.3 C1143 309.5 1186 310.6 1200 311.1" stroke="var(--obj-hi)" />
            <path d="M0 295.9 C14 296.2 57 297.6 86 297.4 C114 297.2 143 296.3 171 294.9 C200 293.4 229 291.3 257 288.9 C286 286.4 314 283.3 343 279.9 C371 276.5 400 272.6 429 268.5 C457 264.4 486 259.9 514 255.2 C543 250.5 571 245.5 600 240.5 C629 235.5 657 230.2 686 225.0 C714 219.8 743 214.4 771 209.2 C800 204.1 829 198.8 857 193.9 C886 189.0 914 184.1 943 179.7 C971 175.3 1000 171.1 1029 167.5 C1057 163.8 1086 160.5 1114 157.9 C1143 155.4 1186 153.1 1200 152.1" stroke="var(--obj-hi)" />
          </g>
        </svg>

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
          /* DNA: en büyük metin 24px, ağırlık en ince, harf aralığı POZİTİF.
             Eskiden 62px'e kadar çıkan serif bir başlıktı — referansın
             tipografi ölçeğiyle bağdaşmıyordu. Tavan 34px'e çekildi:
             24px'ten okunur, 62px'ten uzak. */
          font-weight: 400;
          font-size: clamp(24px, 3vw, 34px);
          letter-spacing: .04em;
          line-height: 1.06;
          color: var(--night);
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
        .cc-lines {
          display: block;
          width: 100%;
          height: clamp(210px, 27vw, 340px);
          margin: var(--s-5) 0 calc(-1 * clamp(118px, 15vw, 190px));
        }

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
          box-shadow: 0 14px 30px -14px rgba(22, 22, 15, .8);
          transition: transform .2s var(--ease), background .2s var(--ease);
        }
        .cc-btn:hover { color: #fff; background: var(--ink-hover); transform: translateY(-2px); }
        .cc-dots { width: 22px; color: var(--grad-1); }
        .cc-dots svg { width: 100%; height: auto; display: block; }

        @media (max-width: 640px) {
          .cc { padding: var(--s-7) var(--s-4) var(--s-6); }
          .cc-lines { margin-bottom: calc(-1 * var(--s-8)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cc-btn { transition: none; }
          .cc-btn:hover { transform: none; }
        }
      `}</style>
    </section>
  )
}
