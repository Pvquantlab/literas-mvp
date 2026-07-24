'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Logo from './logo'

type Props = {
  user: { id: string } | null
  profileName: string | null
  profileAvatar: string | null
}

export default function Header({ user, profileName, profileAvatar }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  // Dışarı tıklayınca menü kapansın
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initials = profileName
    ? profileName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-[1120px] items-center gap-6 px-6">
        {/* Logo */}
        <Link href="/" className="shrink-0" aria-label="literaslab ana sayfa">
          <Logo markSize={32} fontSize={20} />
        </Link>

        {/* Arama çubuğu */}
        <form
          action="/kesfet"
          method="get"
          className="header-search hidden min-[821px]:flex flex-1 max-w-[480px] items-center gap-2 rounded-full border border-line bg-warm py-1 pl-4 pr-1 transition-colors focus-within:border-brand"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8A94A2" strokeWidth="1.8" strokeLinecap="round" className="shrink-0">
            <path d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM16 16l5 5" />
          </svg>
          <input
            type="text"
            name="q"
            placeholder="Etkinlik ara…"
            aria-label="Etkinlik ara"
            className="bare-input min-w-[90px] flex-1 text-sm text-ink"
          />
          <span className="h-[22px] w-px shrink-0 bg-line" />
          <input
            type="text"
            name="city"
            defaultValue="İstanbul"
            aria-label="Şehir"
            className="bare-input w-[104px] shrink-0 text-sm text-ink"
          />
          <button
            type="submit"
            aria-label="Ara"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-white transition hover:bg-brand-dark"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>

        {/* Sağ menü */}
        <nav className="ml-auto flex shrink-0 items-center gap-2.5">
          {user ? (
            <>
              <Link
                href="/community/new"
                className="hidden min-[640px]:inline-flex items-center whitespace-nowrap rounded-full border border-line px-4 py-2 text-[13.5px] font-semibold text-ink transition hover:bg-warm"
              >
                Topluluk kur
              </Link>

              {/* Bildirimler */}
              <Link
                href="/ayarlar/bildirimler"
                aria-label="Bildirimler"
                className="grid h-[38px] w-[38px] place-items-center rounded-full text-ink transition hover:bg-warm"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6zM10 19a2.2 2.2 0 0 0 4 0" />
                </svg>
              </Link>

              {/* Profil dropdown */}
              <div ref={menuRef} className="relative inline-flex">
                <button
                  onClick={() => setMenuOpen((s) => !s)}
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                  aria-label="Profil menüsü"
                  className="flex cursor-pointer items-center gap-1.5 rounded-full p-[3px] transition hover:bg-warm"
                >
                  {profileAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profileAvatar}
                      alt=""
                      className="h-[34px] w-[34px] rounded-full object-cover"
                    />
                  ) : (
                    <span className="grid h-[34px] w-[34px] place-items-center rounded-full border border-line bg-warm text-xs font-bold text-ink">
                      {initials}
                    </span>
                  )}
                  <svg
                    width="12" height="12" viewBox="0 0 24 24"
                    fill="none" stroke="#17202B" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{
                      transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform .15s ease',
                    }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-[46px] z-[60] flex w-[216px] flex-col rounded-2xl border border-line bg-white p-1.5 shadow-[0_14px_34px_rgba(23,32,43,.16)]"
                  >
                    <Link href={`/profile/${user.id}`} role="menuitem" className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-warm">
                      Profil
                    </Link>
                    <Link href="/event/new" role="menuitem" className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-warm">
                      Etkinlik oluştur
                    </Link>
                    <Link href="/ayarlar/profil" role="menuitem" className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-warm">
                      Ayarlar
                    </Link>
                    <span className="mx-2 my-1.5 h-px bg-line" />
                    <button
                      onClick={handleLogout}
                      role="menuitem"
                      className="w-full cursor-pointer rounded-lg px-3 py-2.5 text-left text-sm font-medium text-brand-dark transition hover:bg-brand-tint"
                    >
                      Çıkış yap
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-sm font-semibold text-ink transition hover:bg-warm"
              >
                Giriş yap
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-brand px-[22px] py-2.5 text-sm font-bold text-white transition hover:-translate-y-px hover:bg-brand-dark hover:shadow-md"
              >
                Katıl
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
