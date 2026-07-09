export const metadata = { title: "Sık Sorulan Sorular — literaslab" };

const FAQS = [
  {
    q: "literaslab nedir?",
    a: "İnsanların kendi topluluklarını kurup etkinlik düzenleyebildiği bir platform. İstanbul'da başladık, herkese açığız.",
  },
  {
    q: "Kimler topluluk kurabilir?",
    a: "Kayıt olan herkes. Hesap açmak ücretsiz, topluluk kurmak da öyle. Şu an platformda hiçbir ücret alınmıyor.",
  },
  {
    q: "Etkinlik oluşturmak için ne gerekiyor?",
    a: "Önce bir topluluk kurman ya da bir topluluğa üye olman lazım. Sonra o topluluk altından etkinlik oluşturabilirsin. Etkinlik başlığı, tarih, yer, kısa bir açıklama — hepsi bu.",
  },
  {
    q: "Etkinliklere nasıl katılırım?",
    a: "Etkinlik sayfasında 'Katılıyorum' butonuna tıkla. Etkinlik organizatörüne katılım bilgin ulaşır. Kontenjan doluysa bekleme listesine eklenirsin (yakında).",
  },
  {
    q: "Verilerim nasıl korunuyor?",
    a: "KVKK ve GDPR uyumlu çalışıyoruz. Detaylar için Gizlilik sayfasına bakabilirsin. Bilgilerin sadece platformun çalışması için kullanılır, üçüncü taraflara satılmaz.",
  },
  {
    q: "Hesabımı nasıl silerim?",
    a: "Ayarlar → Hesap Yönetimi → 'Hesabı devre dışı bırak'. Kalıcı silme için Ayarlar → Hesap Yönetimi → 'Veri talebi gönder' seçeneğini kullanabilirsin.",
  },
  {
    q: "Sorun yaşıyorum, kime ulaşırım?",
    a: "İletişim sayfasından bize yazabilirsin, genellikle 1 iş günü içinde döneriz.",
  },
];

export default function SSSPage() {
  return (
    <div style={pageStyle}>
      <div style={{ font: "500 12px 'IBM Plex Mono', monospace", letterSpacing: "0.08em", color: "rgba(30,58,43,0.55)", textTransform: "lowercase", marginBottom: 8 }}>
        yardım merkezi
      </div>
      <h1 style={h1Style}>Sık Sorulan Sorular</h1>
      <p style={leadStyle}>
        Aklına bir soru takıldıysa önce burayı taramak iyi bir başlangıç. Cevabını bulamazsan bize <a href="/iletisim" style={{ color: "var(--ink)", fontWeight: 700 }}>yazabilirsin</a>.
      </p>

      <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 4 }}>
        {FAQS.map((faq, i) => (
          <details key={i} style={detailsStyle}>
            <summary style={summaryStyle}>
              <span>{faq.q}</span>
              <span style={chevronStyle}>+</span>
            </summary>
            <p style={{ margin: "10px 0 4px", fontSize: 15, lineHeight: 1.7, color: "rgba(30,58,43,0.8)" }}>
              {faq.a}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = { maxWidth: 760, margin: "0 auto", padding: "40px 24px 80px" };
const h1Style: React.CSSProperties = { fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(32px, 4.5vw, 48px)", fontWeight: 800, lineHeight: 1.15, margin: "4px 0 18px", letterSpacing: "-0.5px" };
const leadStyle: React.CSSProperties = { fontSize: 16, lineHeight: 1.6, color: "rgba(30,58,43,0.75)", margin: 0, maxWidth: "60ch" };
const detailsStyle: React.CSSProperties = { borderBottom: "1px solid var(--border)", padding: "18px 4px" };
const summaryStyle: React.CSSProperties = { cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 16.5, fontWeight: 700, color: "var(--ink)" };
const chevronStyle: React.CSSProperties = { fontSize: 22, fontWeight: 400, color: "rgba(30,58,43,0.5)", marginLeft: 12 };
