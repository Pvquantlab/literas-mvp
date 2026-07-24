import Link from 'next/link'
import Logo from './logo'

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-warm">
      <div className="mx-auto grid max-w-[1120px] grid-cols-2 gap-10 px-6 pb-9 pt-14 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        {/* Logo + tagline */}
        <div className="col-span-2 md:col-span-1">
          <Link href="/" aria-label="literaslab ana sayfa" className="inline-block">
            <Logo markSize={30} fontSize={20} />
          </Link>
          <p className="mt-3.5 max-w-[260px] text-[13.5px] leading-relaxed text-mute">
            İnsanların kendi topluluklarını kurduğu yer. Çevrimiçi başlar, çevrimdışı buluşur.
          </p>
        </div>

        {/* Keşfet */}
        <FooterColumn title="Keşfet">
          <FooterLink href="/kesfet?tab=topluluklar">Topluluklar</FooterLink>
          <FooterLink href="/kesfet?tab=etkinlikler">Etkinlikler</FooterLink>
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
      </div>

      {/* Alt çizgi + copyright */}
      <div className="mx-auto flex max-w-[1120px] items-center justify-between border-t border-line px-6 pb-8 pt-6 text-[13px] text-mute">
        <span>© 2026 literaslab</span>
        <span className="hidden min-[480px]:inline">çevrimiçi başlar, çevrimdışı buluşur</span>
      </div>
    </footer>
  )
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-3.5 text-[13px] font-bold uppercase tracking-[0.6px] text-mute">
        {title}
      </h4>
      {children}
    </div>
  )
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="mb-2.5 block text-[14.5px] text-body transition hover:text-brand"
    >
      {children}
    </Link>
  )
}
