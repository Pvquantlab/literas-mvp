'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'

type Props = {
  user: { id: string } | null
  profileName: string | null
  profileAvatar: string | null
}

export default function Header({ user, profileName, profileAvatar }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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
    <header style={{
      background: 'var(--paper)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      <div style={{
        maxWidth: '1360px',
        margin: '0 auto',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '18px',
      }}>
        {/* Logo */}
        <Link href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          textDecoration: 'none',
          flex: '0 0 auto',
        }}>
          <span style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'var(--ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--lime)',
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 600,
            fontSize: '15px',
          }}>
            l
          </span>
          <span style={{
            fontSize: '19px',
            fontWeight: 700,
            letterSpacing: '-0.3px',
            color: 'var(--ink)',
          }}>
            literaslab
          </span>
        </Link>

        {/* Arama çubuğu */}
        <form
          action="/kesfet"
          method="get"
          className="header-search"
          style={{
            flex: '1 1 320px',
            maxWidth: '560px',
            minWidth: '220px',
            display: 'flex',
            alignItems: 'center',
            border: '1px solid var(--border-mid)',
            borderRadius: '999px',
            background: 'var(--paper-cream)',
            padding: '3px 3px 3px 16px',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" style={{ flex: '0 0 auto' }}>
            <path d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM16 16l5 5" />
          </svg>
          <input
            type="text"
            name="q"
            placeholder="Etkinlik ara..."
            aria-label="Etkinlik ara"
            style={{
              flex: '1 1 auto',
              minWidth: '60px',
              border: 'none',
              background: 'transparent',
              fontFamily: "'Instrument Sans', sans-serif",
              fontSize: '14px',
              color: 'var(--ink)',
              padding: '9px 10px',
              outline: 'none',
            }}
          />
          <span style={{
            width: '1px',
            height: '22px',
            background: 'var(--border-mid)',
            flex: '0 0 auto',
          }} />
          <input
            type="text"
            name="city"
            defaultValue="İstanbul"
            aria-label="Şehir"
            style={{
              flex: '0 1 110px',
              minWidth: '80px',
              border: 'none',
              background: 'transparent',
              fontFamily: "'Instrument Sans', sans-serif",
              fontSize: '14px',
              color: 'var(--ink)',
              padding: '9px 10px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            aria-label="Ara"
            className="header-search-btn"
            style={{
              flex: '0 0 auto',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              background: 'var(--lime)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round">
              <path d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM16 16l5 5" />
            </svg>
          </button>
        </form>

        {/* Sağ menü */}
        <nav style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flex: '0 0 auto',
        }}>
          {user ? (
            <>
              <Link
                href="/community/new"
                className="header-btn-outline"
                style={{
                  textDecoration: 'none',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  padding: '8px 16px',
                  borderRadius: '999px',
                  border: '1px solid var(--border-mid)',
                  color: 'var(--ink)',
                  whiteSpace: 'nowrap',
                }}
              >
                Yeni topluluk başlat
              </Link>

              {/* Bildirimler */}
              <Link
                href="/ayarlar/bildirimler"
                aria-label="Bildirimler"
                className="header-icon-btn"
                style={{
                  position: 'relative',
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--ink)',
                }}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6zM10 19a2.2 2.2 0 0 0 4 0" />
                </svg>
              </Link>

              {/* Profil dropdown */}
              <div ref={menuRef} style={{ position: 'relative', display: 'inline-flex' }}>
                <button
                  onClick={() => setMenuOpen((s) => !s)}
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                  aria-label="Profil menüsü"
                  className="header-icon-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: '3px',
                    borderRadius: '999px',
                  }}
                >
                  {profileAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profileAvatar}
                      alt=""
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <span style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      background: 'var(--paper-soft)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--ink)',
                    }}>
                      {initials}
                    </span>
                  )}
                  <svg
                    width="12" height="12" viewBox="0 0 24 24"
                    fill="none" stroke="var(--ink)" strokeWidth="2"
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
                  <div role="menu" style={{
                    position: 'absolute',
                    top: '46px',
                    right: 0,
                    width: '216px',
                    background: 'var(--paper-cream)',
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    boxShadow: '0 14px 34px rgba(30,58,43,.16)',
                    padding: '6px',
                    zIndex: 60,
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                    <Link href={`/profile/${user.id}`} role="menuitem" className="menu-item" style={menuItemStyle}>
                      Profil
                    </Link>
                    <Link href="/event/new" role="menuitem" className="menu-item" style={menuItemStyle}>
                      Etkinlik oluştur
                    </Link>
                    <Link href="/ayarlar/profil" role="menuitem" className="menu-item" style={menuItemStyle}>
                      Ayarlar
                    </Link>
                    <span style={{ height: '1px', background: 'var(--border)', margin: '6px 8px' }} />
                    <Link href="/auth/logout" role="menuitem" className="menu-item-danger" style={{
                      ...menuItemStyle,
                      color: 'var(--coral-deep)',
                    }}>
                      Çıkış yap
                    </Link>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                style={{
                  color: 'var(--ink)',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: '8px 12px',
                }}
              >
                Giriş yap
              </Link>
              <Link href="/signup" className="btn-nav">
                Katıl
              </Link>
            </>
          )}
        </nav>
      </div>

      <style>{`
        .header-search:focus-within {
          border-color: var(--ink);
        }
        .header-search-btn:hover {
          background: var(--lime-soft);
        }
        .header-btn-outline:hover {
          background: var(--paper-soft);
        }
        .header-icon-btn:hover {
          background: var(--paper-soft);
        }
        .menu-item:hover {
          background: var(--paper-soft);
        }
        .menu-item-danger:hover {
          background: rgba(190, 81, 39, 0.08);
        }
        @media (max-width: 820px) {
          .header-search {
            display: none !important;
          }
        }
      `}</style>
    </header>
  )
}

const menuItemStyle: React.CSSProperties = {
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 500,
  padding: '9px 12px',
  borderRadius: '9px',
  color: 'var(--ink)',
}
