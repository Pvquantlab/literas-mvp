import Link from 'next/link'

export const metadata = {
  title: 'Gizlilik Politikası — literaslab',
  description: 'Gizlilik Politikası ve KVKK Aydınlatma Metni.',
}

export default function GizlilikPage() {
  return (
    <main style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px 80px' }}>
      <Link
        href="/"
        style={{
          color: 'var(--muted)',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '13px',
          textDecoration: 'none',
          display: 'inline-block',
          marginBottom: '24px',
        }}
      >
        ← ana sayfa
      </Link>

      <h1 className="serif" style={{
        fontSize: 'clamp(32px, 4.4vw, 46px)',
        color: 'var(--ink)',
        margin: '0 0 12px',
        lineHeight: 1.15,
      }}>
        Gizlilik <span className="highlight-yellow">Politikası</span> ve KVKK Aydınlatma Metni
      </h1>

      <p style={{
        fontFamily: "'IBM Plex Mono', monospace",
        color: 'var(--muted)',
        fontSize: '13px',
        marginBottom: '40px',
      }}>
        son güncelleme · 7 temmuz 2026
      </p>

      <Section title="Kısaca">
        <p>literaslab, kullanıcılarının kişisel verilerini korumaya önem verir. Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında hangi bilgileri topladığımızı, hangi hukuki sebeplerle işlediğimizi, kimlerle paylaştığımızı ve senin haklarını açıklar.</p>
        <p>Kısa özet: Sadece hizmeti sunmak için gerekli olan bilgileri topluyoruz. Bilgilerini üçüncü şahıslara satmıyoruz. Hesabını istediğin zaman silebilirsin.</p>
      </Section>

      <Section title="Veri sorumlusu">
        <p>Bu web sitesi <strong>literaslab</strong> tarafından işletilmektedir. KVKK kapsamında {`"veri sorumlusu"`} sıfatıyla kişisel verilerini işleyen taraf literaslab'dır.</p>
        <p>İletişim: <a href="mailto:bildirimler@literaslab.com" style={linkStyle}>bildirimler@literaslab.com</a></p>
      </Section>

      <Section title="Hangi bilgiler toplanıyor">
        <p>Hesap oluşturduğunda ve platformu kullandığında senden aldığımız bilgiler:</p>
        <ul style={listStyle}>
          <li>Ad soyad</li>
          <li>E-posta adresi</li>
          <li>Profil fotoğrafı</li>
          <li>Biyografi</li>
          <li>Katıldığın topluluk ve etkinlik bilgileri</li>
          <li>{`Google ile giriş yaparsan Google'ın paylaştığı temel profil bilgileri (ad, e-posta, profil fotoğrafı)`}</li>
        </ul>
        <p>Otomatik olarak toplanan teknik veriler:</p>
        <ul style={listStyle}>
          <li>IP adresi</li>
          <li>Tarayıcı türü ve işletim sistemi</li>
          <li>Ziyaret ettiğin sayfalar ve erişim log kayıtları</li>
        </ul>
      </Section>

      <Section title="Neden topluyoruz ve hangi hukuki sebeple">
        <p>{`KVKK'nın 10. maddesi uyarınca her işleme amacının hukuki sebebini ayrı ayrı belirtiyoruz:`}</p>
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Amaç</th>
                <th style={thStyle}>Hukuki sebep (KVKK m.5)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>Hesabını oluşturmak, üyeliğini yönetmek</td>
                <td style={tdStyle}>Sözleşmenin kurulması ve ifası (m.5/2-c)</td>
              </tr>
              <tr>
                <td style={tdStyle}>Topluluk ve etkinliklere katılımını sağlamak</td>
                <td style={tdStyle}>Sözleşmenin ifası (m.5/2-c)</td>
              </tr>
              <tr>
                <td style={tdStyle}>Hizmete ilişkin zorunlu bildirim ve hatırlatma e-postaları</td>
                <td style={tdStyle}>Sözleşmenin ifası (m.5/2-c)</td>
              </tr>
              <tr>
                <td style={tdStyle}>Erişim/trafik log kayıtlarının tutulması</td>
                <td style={tdStyle}>Hukuki yükümlülüğün yerine getirilmesi — 5651 sayılı Kanun (m.5/2-ç)</td>
              </tr>
              <tr>
                <td style={tdStyle}>Hizmetin geliştirilmesi ve güvenliğin sağlanması</td>
                <td style={tdStyle}>Meşru menfaat (m.5/2-f)</td>
              </tr>
              <tr>
                <td style={tdStyle}>Tanıtım ve kampanya e-postaları (varsa)</td>
                <td style={tdStyle}><strong>Açık rızan</strong> (m.5/1) — ayrı onay kutusuyla alınır, dilediğinde geri çekebilirsin</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Verilerin nasıl toplanıyor">
        <p>Kişisel verilerin; kayıt ve profil formları, Google ile giriş entegrasyonu ve siteyi kullanımın sırasında otomatik yöntemlerle (log kayıtları, çerezler) elektronik ortamda toplanır.</p>
      </Section>

      <Section title="Kimlerle paylaşılıyor ve yurt dışına aktarım">
        <p>Bilgilerini üçüncü şahıslara satmıyoruz. Hizmetin çalışması için gerekli olan servis sağlayıcılarla paylaşıyoruz:</p>
        <ul style={listStyle}>
          <li><strong>Supabase</strong> — veritabanı ve kullanıcı doğrulama</li>
          <li><strong>Vercel</strong> — site barındırma</li>
          <li><strong>Resend</strong> — e-posta gönderimi</li>
          <li><strong>Google</strong> — yalnızca Google ile giriş yaparsan kimlik doğrulama için</li>
        </ul>
        <p>{`Bu servis sağlayıcıların sunucuları yurt dışında bulunduğundan, verilerin KVKK'nın 9. maddesi kapsamında yurt dışına aktarılmaktadır. Bu aktarım, ilgili sağlayıcılarla imzalanan ve Kişisel Verileri Koruma Kurumu'na bildirilen standart sözleşmeler ile Kanun'da öngörülen uygun güvenceler çerçevesinde gerçekleştirilir.`}</p>
        <p>Yasal zorunluluk halinde yetkili kamu kurum ve kuruluşlarıyla veri paylaşılabilir.</p>
      </Section>

      <Section title="Verilerin ne kadar süre saklanıyor">
        <ul style={listStyle}>
          <li><strong>Hesap bilgileri:</strong> Hesabın aktif olduğu sürece saklanır. Hesabını sildiğinde <strong>30 gün içinde</strong> silinir veya anonim hale getirilir.</li>
          <li><strong>Erişim/trafik log kayıtları:</strong> 5651 sayılı Kanun gereği <strong>en az 1 yıl, en fazla 2 yıl</strong> saklanır.</li>
          <li><strong>Yasal yükümlülük gerektiren kayıtlar:</strong> İlgili mevzuatta öngörülen zamanaşımı süreleri boyunca saklanır.</li>
        </ul>
      </Section>

      <Section title="Senin hakların (KVKK m.11)">
        <p>{`KVKK'nın 11. maddesi kapsamında şunları talep edebilirsin:`}</p>
        <ul style={listStyle}>
          <li>Kişisel verilerinin işlenip işlenmediğini öğrenme</li>
          <li>İşlenmişse buna ilişkin bilgi talep etme</li>
          <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
          <li>Yurt içinde veya yurt dışında verilerin aktarıldığı üçüncü kişileri bilme</li>
          <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
          <li>{`Kanun'da öngörülen şartlar çerçevesinde silinmesini veya yok edilmesini isteme`}</li>
          <li>Düzeltme/silme işlemlerinin verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme</li>
          <li>Münhasıran otomatik sistemlerle analiz edilmesi sonucu aleyhine bir sonucun ortaya çıkmasına itiraz etme</li>
          <li>Kanuna aykırı işleme nedeniyle zarara uğrarsan zararının giderilmesini talep etme</li>
        </ul>
        <p>Bu haklarını kullanmak için <a href="mailto:bildirimler@literaslab.com" style={linkStyle}>bildirimler@literaslab.com</a> adresine yazabilirsin.</p>
        <p>Başvurunu, talebin niteliğine göre <strong>en geç 30 gün içinde ücretsiz</strong> sonuçlandırırız. Başvurunun reddedilmesi, cevabın yetersiz bulunması veya süresinde cevap verilmemesi hâllerinde {`Kişisel Verileri Koruma Kurulu'na`} şikâyette bulunabilirsin.</p>
      </Section>

      <Section title="Çerezler">
        <p>Site, kullanıcı deneyimini iyileştirmek ve oturum yönetimi için çerez kullanır. Tarayıcı ayarlarından çerezleri devre dışı bırakabilirsin; ancak bu bazı özelliklerin çalışmamasına neden olabilir.</p>
      </Section>

      <Section title="Değişiklikler">
        <p>Bu politikayı zaman zaman güncelleyebiliriz. Önemli değişiklikleri e-posta yoluyla bildiririz. Politikanın en son güncelleme tarihini bu sayfanın üstünde görebilirsin.</p>
      </Section>

      <div style={{
        marginTop: '48px',
        padding: '20px 24px',
        background: 'var(--paper-cream)',
        border: '1.5px solid var(--border)',
        borderRadius: '18px',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '13px',
        color: 'var(--muted)',
        lineHeight: 1.6,
      }}>
        ✿ soru için: <a href="mailto:bildirimler@literaslab.com" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>bildirimler@literaslab.com</a>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '36px' }}>
      <h2 className="serif" style={{
        fontSize: 'clamp(20px, 2.4vw, 24px)',
        color: 'var(--ink)',
        marginBottom: '12px',
      }}>
        {title}
      </h2>
      <div style={{
        fontSize: '16px',
        lineHeight: 1.7,
        color: 'var(--ink)',
      }}>
        {children}
      </div>
    </section>
  )
}

const listStyle: React.CSSProperties = {
  marginLeft: '20px',
  marginTop: '8px',
  marginBottom: '12px',
  lineHeight: 1.7,
}

const linkStyle: React.CSSProperties = {
  color: 'var(--ink)',
  fontWeight: 700,
  textDecoration: 'underline',
  textUnderlineOffset: '3px',
}

const tableWrapStyle: React.CSSProperties = {
  overflowX: 'auto',
  marginTop: '12px',
  borderRadius: '14px',
  border: '1.5px solid var(--border)',
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '14.5px',
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 14px',
  background: 'var(--paper-cream)',
  color: 'var(--ink)',
  fontWeight: 700,
  borderBottom: '1.5px solid var(--border)',
  fontSize: '13.5px',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderBottom: '1px solid var(--border)',
  verticalAlign: 'top',
  color: 'var(--ink)',
}