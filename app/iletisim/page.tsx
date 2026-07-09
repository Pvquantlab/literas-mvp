export const metadata = { title: "İletişim — literaslab" };

export default function IletisimPage() {
  return (
    <div style={pageStyle}>
      <div style={{ font: "500 12px 'IBM Plex Mono', monospace", letterSpacing: "0.08em", color: "rgba(30,58,43,0.55)", textTransform: "lowercase", marginBottom: 8 }}>
        destek
      </div>
      <h1 style={h1Style}>İletişim</h1>
      <p style={leadStyle}>
        Bir sorun mu var? Bir öneri mi? Yoksa sadece merhaba mı demek istiyorsun? Hepsine açığız.
      </p>

      <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 20 }}>
        <ContactCard
          title="Genel iletişim"
          desc="Sorular, geri bildirimler, öneriler için."
          contact="destek@literaslab.com"
          href="mailto:destek@literaslab.com"
        />
        <ContactCard
          title="Basın & işbirliği"
          desc="Basın soruları, ortaklık teklifleri için."
          contact="iletisim@literaslab.com"
          href="mailto:iletisim@literaslab.com"
        />
        <ContactCard
          title="Gizlilik & veri talepleri"
          desc="KVKK/GDPR kapsamındaki talepler için."
          contact="gizlilik@literaslab.com"
          href="mailto:gizlilik@literaslab.com"
        />
      </div>

      <div style={{ marginTop: 48, padding: 24, background: "var(--paper-cream)", border: "1px solid var(--border)", borderRadius: 16 }}>
        <div style={{ font: "500 12px 'IBM Plex Mono', monospace", letterSpacing: "0.08em", color: "rgba(30,58,43,0.55)", textTransform: "lowercase", marginBottom: 8 }}>
          yanıt süresi
        </div>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "rgba(30,58,43,0.85)" }}>
          Genellikle 1 iş günü içinde döneriz. Hafta sonu yazarsan pazartesi görürüz.
        </p>
      </div>
    </div>
  );
}

function ContactCard({ title, desc, contact, href }: { title: string; desc: string; contact: string; href: string }) {
  return (
    <a href={href} style={{
      display: "block",
      padding: "22px 24px",
      background: "var(--paper-cream)",
      border: "1px solid var(--border)",
      borderRadius: 16,
      textDecoration: "none",
      color: "var(--ink)",
      transition: "all 0.15s",
    }}>
      <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 14, color: "rgba(30,58,43,0.65)", marginBottom: 8 }}>{desc}</div>
      <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)", fontFamily: "'IBM Plex Mono', monospace" }}>
        {contact} →
      </div>
    </a>
  );
}

const pageStyle: React.CSSProperties = { maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" };
const h1Style: React.CSSProperties = { fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(32px, 4.5vw, 48px)", fontWeight: 800, lineHeight: 1.15, margin: "4px 0 18px", letterSpacing: "-0.5px" };
const leadStyle: React.CSSProperties = { fontSize: 16, lineHeight: 1.6, color: "rgba(30,58,43,0.75)", margin: 0, maxWidth: "58ch" };
