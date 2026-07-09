export const metadata = { title: "Kullanım Şartları — literaslab" };

export default function KosullarPage() {
  return (
    <div style={pageStyle}>
      <div style={{ font: "500 12px 'IBM Plex Mono', monospace", letterSpacing: "0.08em", color: "rgba(30,58,43,0.55)", textTransform: "lowercase", marginBottom: 8 }}>
        yasal
      </div>
      <h1 style={h1Style}>Kullanım Şartları</h1>
      <p style={{ fontSize: 13.5, color: "rgba(30,58,43,0.55)", fontFamily: "'IBM Plex Mono', monospace", margin: "0 0 32px" }}>
        Son güncelleme: 10 Temmuz 2026 · v1
      </p>

      <Section title="1. Kabul">
        <p>literaslab'a (&quot;platform&quot;, &quot;hizmet&quot;) erişerek ve kullanarak bu şartları kabul etmiş sayılırsın. Kabul etmiyorsan lütfen platformu kullanma.</p>
      </Section>

      <Section title="2. Hesap">
        <p>Platformu kullanmak için bir hesap oluşturman gerekebilir. Verdiğin bilgilerin doğru olduğunu, hesabının güvenliğini kendi sorumluluğunda tutacağını kabul ediyorsun. 18 yaşından küçüksen ebeveynin ya da yasal vasinin izniyle kullanmalısın.</p>
      </Section>

      <Section title="3. Kullanıcı içeriği">
        <p>Platforma yüklediğin içeriklerin (etkinlik açıklamaları, topluluk bilgileri, mesajlar, görseller) sahipliği sana aittir. Ama bu içerikleri platform üzerinde göstermemiz için bize telif hakkı verirsin. İçeriklerin bu şartlara ve <a href="/topluluk-kurallari" style={linkStyle}>Topluluk Kurallarına</a> uygun olmasından sorumlusun.</p>
      </Section>

      <Section title="4. Yasak davranışlar">
        <p>Aşağıdaki davranışlar hesabının askıya alınmasına ya da kalıcı silinmesine yol açar: yasadışı içerik paylaşımı, taciz, nefret söylemi, spam, sahte kimlik, kötü niyetli kod yükleme, başkalarının hesabına yetkisiz erişim. Detaylı liste için <a href="/topluluk-kurallari" style={linkStyle}>Topluluk Kurallarına</a> bak.</p>
      </Section>

      <Section title="5. Ücretlendirme">
        <p>Şu an platform ücretsiz. İleride bazı özellikler ücretli olabilir, ancak bunu duyurmadan yapmayız. Mevcut hesabında sonradan sürpriz ücretle karşılaşmayacaksın.</p>
      </Section>

      <Section title="6. Sorumluluğun sınırı">
        <p>literaslab, üçüncü taraf etkinlik ve toplulukların içeriğinden ya da o etkinliklerde yaşananlardan doğrudan sorumlu değildir. Etkinliklere kendi güvenliğini kendin değerlendirerek katıl. Yine de kural ihlali bildirirsen inceleriz.</p>
      </Section>

      <Section title="7. Fesih">
        <p>Bu şartları ihlal edersen hesabını uyarısız askıya alma ya da silme hakkımız saklıdır. Sen de istediğin zaman hesabını devre dışı bırakabilir ya da silebilirsin.</p>
      </Section>

      <Section title="8. Değişiklikler">
        <p>Bu şartlar zaman zaman güncellenebilir. Önemli bir değişiklik olursa e-postayla haber veririz. Güncellenmiş şartları kabul etmezsen hesabını silme hakkın vardır.</p>
      </Section>

      <Section title="9. İletişim">
        <p>Bu şartlarla ilgili soruların için: <a href="mailto:iletisim@literaslab.com" style={linkStyle}>iletisim@literaslab.com</a></p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px" }}>{title}</h2>
      <div style={{ fontSize: 14.5, lineHeight: 1.7, color: "rgba(30,58,43,0.82)" }}>{children}</div>
    </section>
  );
}

const pageStyle: React.CSSProperties = { maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" };
const h1Style: React.CSSProperties = { fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(32px, 4.5vw, 48px)", fontWeight: 800, lineHeight: 1.15, margin: "4px 0 6px", letterSpacing: "-0.5px" };
const linkStyle: React.CSSProperties = { color: "var(--ink)", fontWeight: 700, textDecoration: "underline" };
