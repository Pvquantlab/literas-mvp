"use client";

import type { JSX } from "react";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";

type Category = { slug: string; label: string };

const ICONS: Record<string, JSX.Element> = {
  kitap: <path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/>,
  doga: <path d="M3 20l6-10 4 6 3-4 5 8z"/>,
  muzik: <><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>,
  lezzet: <><path d="M6 8h10a2 2 0 0 1 2 2v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-3a2 2 0 0 1 2-2z"/><path d="M18 10h1a2 2 0 0 1 0 4h-1"/></>,
  dil: <><path d="M4 6h12v10H8l-4 3z"/><circle cx="9" cy="11" r="0.8" fill="currentColor"/><circle cx="12" cy="11" r="0.8" fill="currentColor"/></>,
  spor: <><path d="M12 4c3 0 5 4 5 8s-2 8-5 8-5-4-5-8 2-8 5-8z"/><path d="M4 8l16 8M4 16l16-8"/></>,
  sanat: <><circle cx="12" cy="12" r="9"/><circle cx="7" cy="10" r="1.2" fill="currentColor"/><circle cx="12" cy="7" r="1.2" fill="currentColor"/><circle cx="17" cy="10" r="1.2" fill="currentColor"/></>,
  oyun: <><rect x="3" y="8" width="18" height="10" rx="4"/><path d="M8 12h2M9 11v2M15 12h.01M17 13h.01"/></>,
  tech: <><rect x="4" y="4" width="16" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></>,
  sinema: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 8h18M8 4v4M16 4v4M8 20v-4M16 20v-4"/></>,
  fotograf: <><rect x="3" y="7" width="18" height="12" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M9 7l2-3h2l2 3"/></>,
  gonulluluk: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>,
  kariyer: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
  sosyal: <><circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0M14 20a5 5 0 0 1 8-2"/></>,
};

export default function CategoryStrip({
  categories,
  activeCategory,
  activeTab,
}: {
  categories: Category[];
  activeCategory: string | null;
  activeTab: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const check = () => {
      setCanScrollLeft(el.scrollLeft > 8);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    };
    check();
    el.addEventListener("scroll", check);
    window.addEventListener("resize", check);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  const scroll = (dir: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  const buildHref = (slug: string | null) => {
    const params = new URLSearchParams();
    params.set("tab", activeTab);
    if (slug) params.set("kategori", slug);
    return `/kesfet?${params.toString()}`;
  };

  return (
    <div style={{ position: "relative", marginTop: 4 }}>
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          aria-label="Sola kaydır"
          style={arrowBtnStyle("left")}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 6l-6 6 6 6"/></svg>
        </button>
      )}

      <div
        ref={scrollerRef}
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          scrollBehavior: "smooth",
          padding: "6px 4px 14px",
          scrollbarWidth: "none",
          msOverflowStyle: "none" as "none",
        }}
      >
        <CategoryButton
          href={buildHref(null)}
          label="Tümü"
          isActive={!activeCategory}
        />
        {categories.map((cat) => (
          <CategoryButton
            key={cat.slug}
            href={buildHref(cat.slug)}
            label={cat.label}
            icon={ICONS[cat.slug]}
            isActive={activeCategory === cat.slug}
          />
        ))}
      </div>

      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          aria-label="Sağa kaydır"
          style={arrowBtnStyle("right")}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 6l6 6-6 6"/></svg>
        </button>
      )}
    </div>
  );
}

function CategoryButton({
  href,
  label,
  icon,
  isActive,
}: {
  href: string;
  label: string;
  icon?: JSX.Element;
  isActive: boolean;
}) {
  return (
    <Link href={href} style={{
      flex: "0 0 auto",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6,
      padding: "8px 14px 4px",
      textDecoration: "none",
      color: "var(--ink)",
      minWidth: 78,
    }}>
      {icon ? (
        <span style={{
          width: 52, height: 52, borderRadius: "50%",
          border: `1.5px solid ${isActive ? "var(--ink)" : "var(--border)"}`,
          background: isActive ? "var(--lime)" : "var(--paper)",
          display: "grid", placeItems: "center",
          transition: "all 0.15s",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            {icon}
          </svg>
        </span>
      ) : (
        <span style={{
          width: 52, height: 52, borderRadius: "50%",
          border: `1.5px solid ${isActive ? "var(--ink)" : "var(--border)"}`,
          background: isActive ? "var(--lime)" : "var(--paper)",
          display: "grid", placeItems: "center",
          fontSize: 18, fontWeight: 700,
          transition: "all 0.15s",
        }}>✳</span>
      )}
      <span style={{
        fontSize: 12.5,
        fontWeight: isActive ? 700 : 500,
        whiteSpace: "nowrap",
      }}>{label}</span>
      <span style={{
        height: 3,
        width: 42,
        borderRadius: "3px 3px 0 0",
        background: "var(--ink)",
        opacity: isActive ? 1 : 0,
        transition: "opacity 0.15s",
      }}/>
    </Link>
  );
}

function arrowBtnStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    top: 22,
    [side]: 4,
    width: 36, height: 36,
    borderRadius: "50%",
    border: "1px solid var(--border)",
    background: "var(--paper-cream)",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    boxShadow: "0 2px 8px rgba(30,58,43,0.10)",
    zIndex: 2,
    color: "var(--ink)",
  };
}
