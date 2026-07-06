import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{ background: 'var(--ink)', marginTop: '64px', padding: '0 24px' }}>
      <div
        style={{
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '56px 0 0',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '40px 56px',
        }}
      >
        {/* Logo + tagline */}
        <div style={{ flex: '1 1 220px', minWidth: '200px' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
            }}
          >
            <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path
                d="M4 6a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4h-9l-6 5v-5H8a4 4 0 0 1-4-4z"
                fill="var(--paper-soft)"
              />
              <text
                x="10"
                y="20"
                fontFamily="system-ui, sans-serif"
                fontSize="14"
                fontWeight="800"
                fill="var(--ink)"
              >
                l
              </text>
              <circle cx="22" cy="18" r="2.2" fill="var(--coral)" />
            </svg>
            <span
              style={{
                fontFamily: 'system-ui, sans-serif',
                fontWeight: 800,
                fontSize: '23px',
                color: 'var(--paper-soft)',
                letterSpacing: '-0.02em',
              }}
            >
              literaslab
            </span>
          </Link>
          <p
            style={{
              fontSize: '14px',
              lineHeight: 1.6,
              color: 'rgba(250, 244, 232, .6)',
              margin: '14px 0 0',
              maxWidth: '240px',
            }}
          >
            İnsanların kendi topluluklarını kurduğu yer. Tamamen ücretsiz.
          </p>
        </div>

        {/* Keşfet */}
        <FooterColumn title="Keşfet">
          <FooterLink href="/">Topluluklar</FooterLink>
          <FooterLink href="/">Etkinlikler</FooterLink>
          <FooterLink href="/">Şehirler</FooterLink>
          <FooterLink href="/#kesfet">Kategoriler</FooterLink>
        </FooterColumn>

        {/* Literaslab */}
        <FooterColumn title="Literaslab">
          <FooterLink href="/">Hakkında</FooterLink>
          <FooterLink href="/">İletişim</FooterLink>
          <FooterLink href="/">SSS</FooterLink>
        </FooterColumn>

        {/* Destek */}
        <FooterColumn title="Destek">
          <FooterLink href="/">Yardım merkezi</FooterLink>
          <FooterLink href="/">Topluluk kuralları</FooterLink>
          <FooterLink href="/">Gizlilik</FooterLink>
          <FooterLink href="/">Kullanım şartları</FooterLink>
        </FooterColumn>

        {/* Sosyal medya */}
        <div style={{ flex: '1 1 150px', minWidth: '140px' }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--paper-soft)',
              marginBottom: '14px',
            }}
          >
            Bizi takip edin
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <SocialIcon href="#" label="Instagram">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
            </SocialIcon>
            <SocialIcon href="#" label="X">
              <path
                d="M4.5 4h4l4.1 5.7L17.4 4H20l-6.1 7.5L20.5 20h-4l-4.4-6.1L7 20H4.4l6.5-8z"
                fill="currentColor"
                stroke="none"
              />
            </SocialIcon>
            <SocialIcon href="#" label="YouTube">
              <rect x="2.5" y="6" width="19" height="13" rx="4" />
              <path d="M10 9.7v5.6l5.2-2.8z" fill="currentColor" stroke="none" />
            </SocialIcon>
          </div>
        </div>
      </div>

      {/* Alt çizgi + copyright */}
      <div
        style={{
          maxWidth: '1240px',
          borderTop: '1px solid rgba(250, 244, 232, .18)',
          margin: '44px auto 0',
          padding: '20px 0 26px',
          textAlign: 'center',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '12.5px',
          color: 'rgba(250, 244, 232, .55)',
        }}
      >
        © 2026 literaslab · çevrimiçi başlar, çevrimdışı buluşur ✿
      </div>
    </footer>
  )
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
      <div
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: 'var(--paper-soft)',
          marginBottom: '14px',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        display: 'block',
        fontSize: '14px',
        color: 'rgba(250, 244, 232, .65)',
        textDecoration: 'none',
        marginBottom: '10px',
        transition: 'color 0.15s ease',
      }}
    >
      {children}
    </Link>
  )
}

function SocialIcon({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      style={{
        width: '38px',
        height: '38px',
        borderRadius: '50%',
        border: '1.5px solid rgba(250, 244, 232, .4)',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--paper-soft)',
        transition: 'all 0.15s ease',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </Link>
  )
}