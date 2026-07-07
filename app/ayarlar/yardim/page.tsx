import Link from "next/link";

const HELP_ITEMS = [
  { title: "Yardım merkezi", desc: "Sık sorulan konular ve rehberler", href: "/sss" },
  { title: "Topluluk kuralları", desc: "literaslab'de birlikte nasıl var oluyoruz", href: "/topluluk-kurallari" },
  { title: "SSS", desc: "Üyelik, etkinlikler ve topluluk kurma hakkında", href: "/sss" },
  { title: "İletişim", desc: "Destek ekibine yazın — genellikle 1 iş günü içinde döneriz", href: "/iletisim" },
];

export default function YardimPage() {
  return (
    <>
      <div style={{ font: "500 12px 'IBM Plex Mono', monospace", letterSpacing: "0.08em", color: "rgba(30,58,43,0.55)", textTransform: "lowercase" }}>
        hesap ayarları
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", margin: "6px 0 10px" }}>
        Yardım
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.55, color: "rgba(30,58,43,0.7)", margin: "0 0 28px", maxWidth: "56ch" }}>
        Bir sorunuz mu var? Aşağıdaki kaynaklardan yanıt bulabilir veya bize ulaşabilirsiniz.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {HELP_ITEMS.map((item) => (
          <Link key={item.title} href={item.href} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 22px",
            border: "1.5px solid var(--border)",
            borderRadius: 16,
            background: "var(--paper-cream)",
            textDecoration: "none",
            color: "var(--ink)",
            transition: "all 0.15s",
          }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 13.5, color: "rgba(30,58,43,0.65)" }}>{item.desc}</div>
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)" }}>→</span>
          </Link>
        ))}
      </div>
    </>
  );
}
