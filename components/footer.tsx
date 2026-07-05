import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{
      maxWidth: '1360px',
      margin: '0 auto 24px',
      padding: '0 16px',
    }}>
      <div style={{
        background: 'var(--ink-deep)',
        borderRadius: '28px',
        padding: '56px 48px 40px',
        color: '#ffffff',
      }}>
        {/* Üst satır: logo + CTA */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
          flexWrap: 'wrap',
          paddingBottom: '36px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.18)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="30" height="30" viewBox="0 0 34 34" fill="none" aria-hidden="true">
              <path d="M4 10 C4 5.6 7.6 2 12 2 L22 2 C26.4 2 30 5.6 30 10 L30 18 C30 22.4 26.4 26 22 26 L14 26 L7 32 C5.9 32.9 4 32.2 4 30.6 Z" fill="#ffffff" />
              <rect x="13" y="8" width="4.4" height="13" rx="2.2" fill="#173F22" />
              <circle cx="22.5" cy="18.8" r="2.6" fill="#C4622D" />
            </svg>
            <span style={{
              fontSize: '24px',
              fontWeight: 800,
              letterSpacing: '-0.7px',
              color: '#ffffff',
            }}>
              literas
            </span>
          </div>
          <Link href="/community/new" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '20px',
            fontWeight: 800,
            letterSpacing: '-0.5px',
            color: '#ffffff',
            textDecoration: 'none',
          }}>
            Kendi topluluğunu kur — ücretsiz
            <span style={{
              background: 'var(--seal)',
              borderRadius: '999px',
              padding: '10px 22px',
              fontSize: '15px',
              fontWeight: 700,
              color: '#ffffff',
            }}>
              Başlayın →
            </span>
          </Link>
        </div>

        {/* Link sütunları */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '32px',
          padding: '40px 0',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '15px', fontWeight: 800 }}>Keşfet</span>
            <Link href="/" style={footerLinkStyle}>Topluluklar</Link>
            <Link href="/" style={footerLinkStyle}>Etkinlikler</Link>
            <Link href="/" style={footerLinkStyle}>Şehirler</Link>
            <Link href="/" style={footerLinkStyle}>Kategoriler</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '15px', fontWeight: 800 }}>Literas</span>
            <Link href="/hakkinda" style={footerLinkStyle}>Hakkında</Link>
            <Link href="/blog" style={footerLinkStyle}>Blog</Link>
            <Link href="/iletisim" style={footerLinkStyle}>İletişim</Link>
            <Link href="/sss" style={footerLinkStyle}>SSS</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '15px', fontWeight: 800 }}>Destek</span>
            <Link href="/yardim" style={footerLinkStyle}>Yardım merkezi</Link>
            <Link href="/kurallar" style={footerLinkStyle}>Topluluk kuralları</Link>
            <Link href="/gizlilik" style={footerLinkStyle}>Gizlilik</Link>
            <Link href="/kullanim-sartlari" style={footerLinkStyle}>Kullanım şartları</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span style={{ fontSize: '15px', fontWeight: 800 }}>Bizi takip edin</span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <a href="#" aria-label="Instagram" style={socialIconStyle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                </svg>
              </a>
              <a href="#" aria-label="X (Twitter)" style={socialIconStyle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="#" aria-label="YouTube" style={socialIconStyle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Alt satır: telif */}
        <div style={{
          paddingTop: '24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.18)',
          fontSize: '13px',
          color: 'rgba(255, 255, 255, 0.6)',
        }}>
          © {new Date().getFullYear()} literas. Topluluk kurmak herkes için ücretsizdir.
        </div>
      </div>
    </footer>
  )
}

const footerLinkStyle = {
  fontSize: '14.5px',
  fontWeight: 500,
  color: 'rgba(255, 255, 255, 0.75)',
  textDecoration: 'none',
}

const socialIconStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '38px',
  height: '38px',
  borderRadius: '50%',
  background: 'rgba(255, 255, 255, 0.1)',
  color: '#ffffff',
  textDecoration: 'none',
}