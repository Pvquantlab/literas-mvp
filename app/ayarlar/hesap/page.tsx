import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { updateAccount, deactivateAccount } from "./actions";

export default async function HesapPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, language, timezone")
    .eq("id", user.id)
    .single();

  return (
    <>
      <div style={{ font: "500 12px 'IBM Plex Mono', monospace", letterSpacing: "0.08em", color: "rgba(30,58,43,0.55)", textTransform: "lowercase" }}>
        hesap ayarları
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", margin: "6px 0 10px" }}>
        Hesap Yönetimi
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.55, color: "rgba(30,58,43,0.7)", margin: "0 0 28px", maxWidth: "56ch" }}>
        Oturum bilgileriniz, dil ve saat dilimi tercihlerinizi yönetin.
      </p>

      <form action={updateAccount}>
        <div style={{ marginBottom: 26 }}>
          <label style={labelStyle}>E-posta adresiniz</label>
          <input type="email" name="email" defaultValue={profile?.email || user.email || ""} style={inputStyle} />
        </div>

        <div style={{ marginBottom: 26 }}>
          <label style={labelStyle}>Dil</label>
          <select name="language" defaultValue={profile?.language || "tr"} style={inputStyle}>
            <option value="tr">Türkçe</option>
            <option value="en">English</option>
          </select>
        </div>

        <div style={{ marginBottom: 26 }}>
          <label style={labelStyle}>Birincil saat dilimi</label>
          <select name="timezone" defaultValue={profile?.timezone || "Europe/Istanbul"} style={inputStyle}>
            <option value="Europe/Istanbul">(GMT+03:00) İstanbul — Türkiye Standart Saati</option>
            <option value="Europe/London">(GMT+00:00) London</option>
            <option value="Europe/Berlin">(GMT+01:00) Berlin</option>
            <option value="America/New_York">(GMT-05:00) New York</option>
          </select>
          <p style={{ fontSize: 13, color: "rgba(30,58,43,0.6)", marginTop: 8 }}>
            Seçiminiz, etkinlik saatlerinin nasıl görüntüleneceğini etkiler.
          </p>
        </div>

        <button type="submit" style={saveButtonStyle}>
          Değişiklikleri kaydet
        </button>
      </form>

      <hr style={{ border: "none", borderTop: "1px dashed var(--border)", margin: "40px 0 32px" }} />

      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionTitleStyle}>Parolanızı değiştirin</h2>
        <p style={sectionTextStyle}>
          Parolanızı değiştirdiğinizde diğer tüm oturumlarınız güvenlik için otomatik olarak kapatılır.
        </p>
        <a href="#" style={linkStyle}>Parolayı değiştir</a>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionTitleStyle}>Hesabınızı devre dışı bırakın</h2>
        <p style={sectionTextStyle}>
          Hesabınız gizlenir; geri dönmek isterseniz e-postanızla yeniden etkinleştirebilirsiniz.
        </p>
        <form action={deactivateAccount}>
          <button type="submit" style={{ ...linkStyle, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "var(--coral-deep)" }}>
            Hesabı devre dışı bırak
          </button>
        </form>
      </section>

      <section>
        <h2 style={sectionTitleStyle}>Veri talepleri (KVKK/GDPR)</h2>
        <p style={sectionTextStyle}>
          Verilerinizin bir kopyasını isteyin veya kalıcı olarak silinmesini talep edin.
        </p>
        <a href="mailto:destek@literaslab.com?subject=Veri talebi" style={linkStyle}>Veri talebi gönder</a>
      </section>
    </>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "12px 14px",
  border: "1.5px solid var(--border)",
  borderRadius: 12,
  background: "var(--paper-cream)",
  fontSize: 14.5,
  color: "var(--ink)",
  outline: "none",
  fontFamily: "inherit",
};
const labelStyle = { display: "block", fontSize: 14, fontWeight: 700, marginBottom: 8 };
const saveButtonStyle = {
  marginTop: 8,
  padding: "13px 26px",
  background: "var(--lime)",
  border: "2px solid var(--ink)",
  borderRadius: 999,
  fontSize: 14.5,
  fontWeight: 700,
  color: "var(--ink)",
  cursor: "pointer",
  boxShadow: "4px 5px 0 var(--ink)",
};
const sectionTitleStyle = { fontSize: 18, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.01em" };
const sectionTextStyle = { fontSize: 14.5, lineHeight: 1.55, color: "rgba(30,58,43,0.7)", margin: "0 0 12px" };
const linkStyle = { fontSize: 14, fontWeight: 700, color: "var(--ink)", textDecoration: "underline" };