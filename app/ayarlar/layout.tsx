import type { JSX } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

const menuItems = [
  { slug: "profil", label: "Profili Düzenle", icon: "edit", active: true },
  { slug: "kisisel", label: "Kişisel Bilgiler", icon: "user", active: true },
  { slug: "hesap", label: "Hesap Yönetimi", icon: "settings", active: true },
  { slug: "eposta", label: "E-posta Güncellemeleri", icon: "mail", active: true },
  { slug: "gizlilik", label: "Gizlilik", icon: "lock", active: true },
  { slug: "sosyal-medya", label: "Sosyal Medya", icon: "share", active: true },
  { slug: "ilgi-alanlari", label: "İlgi Alanları", icon: "heart", active: true },
  { slug: "bildirimler", label: "Bildirimler", icon: "bell", active: true },
  { slug: "yardim", label: "Yardım", icon: "help", active: true },
];

const icons: Record<string, JSX.Element> = {
  edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></>,
  user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
  mail: <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></>,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
  share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></>,
  heart: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>,
  bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
  help: <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
};

export default async function AyarlarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
 const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 28px 60px", display: "flex", gap: 32, alignItems: "flex-start" }}>
      <aside style={{
        position: "sticky",
        top: 16,
        flex: "0 0 260px",
        background: "var(--paper-cream)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        boxShadow: "0 6px 24px rgba(30,58,43,0.07)",
        padding: 10,
      }}>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {menuItems.map((item) => (
            <MenuLink key={item.slug} item={item} />
          ))}
        </nav>
      </aside>

      <main style={{ flex: 1, minWidth: 0, maxWidth: 720, paddingTop: 6 }}>
        {children}
      </main>
    </div>
  );
}

function MenuLink({ item }: { item: typeof menuItems[0] }) {
  const inner = (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 14px",
      borderRadius: 999,
      fontSize: 14.5,
      fontWeight: 600,
      color: item.active ? "var(--ink)" : "rgba(30,58,43,0.4)",
      cursor: item.active ? "pointer" : "not-allowed",
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {icons[item.icon]}
      </svg>
      <span style={{ flex: 1 }}>{item.label}</span>
      {!item.active && (
        <span style={{
          fontSize: 10,
          fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)",
          padding: "2px 6px",
          background: "rgba(30,58,43,0.06)",
          borderRadius: 4,
          letterSpacing: 0.5,
        }}>yakında</span>
      )}
    </div>
  );

  if (!item.active) return inner;
  return <Link href={`/ayarlar/${item.slug}`} style={{ textDecoration: "none" }}>{inner}</Link>;
}