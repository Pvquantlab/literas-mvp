import Link from 'next/link'
import Logo from '@/components/logo'

export default function Footer() {
  return (
    /* Greige panel (referansta koyu ya da mavi footer yok): metin mürekkep ve
       --muted, çizgi ve halkalar --border. */
    <footer style={{ background: 'var(--paper-cream)', marginTop: '64px', padding: '0 24px' }}>
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
              textDecoration: 'none',
            }}
          >
            <Logo size={34} fontSize={23} tone="plain" color="var(--ink)" />
          </Link>
         <p
            style={{
              fontSize: '14px',
              lineHeight: 1.6,
              color: 'var(--muted)',
              margin: '14px 0 0',
              maxWidth: '240px',
            }}
          >
            İnsanların kendi masalarını kurduğu yer. Herkese açık.
          </p>
        </div>

        {/* Keşfet */}
        <FooterColumn title="Keşfet">
          <FooterLink href="/kesfet?tab=topluluklar">Topluluklar</FooterLink>
          <FooterLink href="/kesfet?tab=etkinlikler">Etkinlikler</FooterLink>
          <FooterLink href="/kesfet">Şehirler</FooterLink>
          <FooterLink href="/kesfet">Kategoriler</FooterLink>
        </FooterColumn>

        {/* Literaslab */}
        <FooterColumn title="Literaslab">
          <FooterLink href="/hakkinda">Hakkında</FooterLink>
          <FooterLink href="/iletisim">İletişim</FooterLink>
          <FooterLink href="/sss">SSS</FooterLink>
        </FooterColumn>

        {/* Destek */}
        <FooterColumn title="Destek">
          <FooterLink href="/sss">Yardım merkezi</FooterLink>
          <FooterLink href="/topluluk-kurallari">Topluluk kuralları</FooterLink>
          <FooterLink href="/gizlilik">Gizlilik</FooterLink>
          <FooterLink href="/kosullar">Kullanım şartları</FooterLink>
        </FooterColumn>

        {/* Sosyal medya */}
        <div style={{ flex: '1 1 150px', minWidth: '140px' }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--ink)',
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
          borderTop: '1px solid var(--border)',
          margin: '44px auto 0',
          padding: '20px 0 26px',
          textAlign: 'center',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '12.5px',
          color: 'var(--muted)',
        }}
      >
        © 2026 literaslab · çevrimiçi başlar, çevrimdışı buluşur
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
          color: 'var(--ink)',
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
        color: 'var(--muted)',
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
        border: '1.5px solid var(--border-mid)',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--ink)',
        transition: 'all 0.15s ease',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </Link>
  )
}
