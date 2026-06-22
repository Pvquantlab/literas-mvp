import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Literas — Topluluğunu kur',
  description: 'İnsanların kendi topluluklarını kurduğu bir yer.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,500;1,400&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <nav className="nav">
          <div className="container">
            <Link href="/" className="brand">
              <div className="l">L</div>
              <div className="word">literas</div>
            </Link>
            <div className="actions">
              <Link href="/" className="">Etkinlikler</Link>
              <Link href="/event/new" className="cta">+ Yeni etkinlik</Link>
            </div>
          </div>
        </nav>

        <main>
          <div className="container">
            {children}
          </div>
        </main>

        <footer>
          <div className="brand">
            <div className="l">L</div>
            <div className="word">literas</div>
          </div>
          <div>İnsanların kendi topluluklarını kurduğu bir yer · 2026</div>
        </footer>
      </body>
    </html>
  );
}
