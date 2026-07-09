import Link from "next/link";

export default function TabBar({
  activeTab,
  activeCategory,
}: {
  activeTab: string;
  activeCategory: string | null;
}) {
  const catQuery = activeCategory ? `&kategori=${activeCategory}` : "";

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
      <TabLink
        href={`/kesfet?tab=etkinlikler${catQuery}`}
        active={activeTab === "etkinlikler"}
        label="Etkinlikler"
      />
      <TabLink
        href={`/kesfet?tab=topluluklar${catQuery}`}
        active={activeTab === "topluluklar"}
        label="Topluluklar"
      />
    </div>
  );
}

function TabLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link href={href} style={{
      padding: "9px 20px",
      borderRadius: 999,
      fontSize: 14.5,
      fontWeight: active ? 700 : 500,
      background: active ? "var(--ink)" : "transparent",
      color: active ? "var(--paper-cream)" : "var(--ink)",
      textDecoration: "none",
      border: active ? "none" : "1px solid transparent",
      transition: "all 0.15s",
    }}>
      {label}
    </Link>
  );
}
