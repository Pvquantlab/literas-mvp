export const metadata = { title: "Hakkında — literaslab" };

export default function HakkindaPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>
      <div style={{ font: "500 12px 'IBM Plex Mono', monospace", letterSpacing: "0.08em", color: "rgba(30,58,43,0.55)", textTransform: "lowercase", marginBottom: 8 }}>
        literaslab
      </div>
      <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(32px, 4.5vw, 48px)", fontWeight: 800, lineHeight: 1.15, margin: "4px 0 24px", letterSpacing: "-0.5px" }}>
        Hakkında
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(30,58,43,0.8)", margin: "0 0 20px" }}>
        Yakında burada literaslab'ın hikayesi olacak.
      </p>
      <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(30,58,43,0.65)", margin: 0 }}>
        Bu arada <a href="/kesfet" style={{ color: "var(--ink)", fontWeight: 700 }}>etkinlikleri keşfedebilir</a> ya da <a href="/community/new" style={{ color: "var(--ink)", fontWeight: 700 }}>kendi topluluğunu kurabilirsin</a>.
      </p>
    </div>
  );
}
