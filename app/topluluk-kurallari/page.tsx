export const metadata = { title: "Topluluk Kuralları — literaslab" };

const RULES = [
  { title: "Birbirine saygı", desc: "Herkesin farklı bir yaşam öyküsü var. Aşağılayıcı, tehditkâr, ayrımcı dil kullanma. Nezaket bulaşıcıdır." },
  { title: "Gerçek ol", desc: "Kendini olduğun gibi göster. Sahte profiller, kimlik hırsızlığı, yanıltıcı tanıtımlar kabul edilmez." },
  { title: "Nefret yok", desc: "Irk, cinsiyet, cinsel yönelim, din, engellilik ya da milliyet üzerinden nefret söylemine yer yok." },
  { title: "Taciz yok", desc: "Kimseyi rahatsız etme, takip etme, tehdit etme. 'Şaka' bahanesi kabul edilmez." },
  { title: "Reklam ve spam yok", desc: "Etkinlikler ve topluluklar samimi buluşmalar için. Ürün satmak, MLM işi, toplu üye avı burada olmaz." },
  { title: "Yasadışı içerik yok", desc: "Yasadışı faaliyetler, telif ihlali, uyuşturucu, silah — hepsi yasak." },
  { title: "Çocuk güvenliği", desc: "18 yaş altı kullanıcıları etkileyecek içerik kesinlikle yasak. Bu konuda sıfır tolerans." },
  { title: "Söz verdiğine git", desc: "Katılacağını söylediğin etkinliğe gitmeye çalış. Gidemezsen katılımını iptal et — kontenjan başkasına açılsın." },
];

export default function TopKurallariPage() {
  return (
    <div style={pageStyle}>
      <div style={{ font: "500 12px 'IBM Plex Mono', monospace", letterSpacing: "0.08em", color: "rgba(30,58,43,0.55)", textTransform: "lowercase", marginBottom: 8 }}>
        yardım merkezi
      </div>
      <h1 style={h1Style}>Topluluk Kuralları</h1>
      <p style={leadStyle}>
        literaslab bir masa. Etrafında farklı insanlar oturuyor. Herkesin rahatça oturabilmesi için birkaç basit anlaşmamız var.
      </p>

      <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 18 }}>
        {RULES.map((rule, i) => (
          <div key={i} style={{ padding: "20px 22px", background: "var(--paper-cream)", border: "1px solid var(--border)", borderRadius: 14 }}>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>{rule.title}</div>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65, color: "rgba(30,58,43,0.8)" }}>{rule.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 40, padding: 24, background: "var(--paper-cream)", border: "1.5px dashed var(--border)", borderRadius: 16 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 800 }}>Kuralları ihlal eden içerik gördün mü?</h2>
        <p style={{ margin: "0 0 12px", fontSize: 14.5, lineHeight: 1.6, color: "rgba(30,58,43,0.75)" }}>
          Bize <a href="mailto:destek@literaslab.com" style={{ color: "var(--ink)", fontWeight: 700 }}>destek@literaslab.com</a> adresinden yaz. İçeriği inceleriz, gerekirse kaldırırız, ciddi durumlarda hesap askıya alınır.
        </p>
        <p style={{ margin: 0, fontSize: 13.5, color: "rgba(30,58,43,0.6)" }}>
          Acil bir durum varsa (kendine ya da başkasına zarar tehlikesi) önce 112'yi ara, sonra bize bildir.
        </p>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = { maxWidth: 760, margin: "0 auto", padding: "40px 24px 80px" };
const h1Style: React.CSSProperties = { fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(32px, 4.5vw, 48px)", fontWeight: 800, lineHeight: 1.15, margin: "4px 0 18px", letterSpacing: "-0.5px" };
const leadStyle: React.CSSProperties = { fontSize: 16, lineHeight: 1.65, color: "rgba(30,58,43,0.75)", margin: 0, maxWidth: "58ch" };
