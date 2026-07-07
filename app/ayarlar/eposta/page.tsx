import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { updateEposta, disableAllEmails } from "./actions";

const TOGGLES = [
  { name: "email_messages", label: "Mesajlar", desc: "Bana mesaj gönderildiğinde e-postayla bilgilendir" },
  { name: "email_replies", label: "Yorumlara verilen cevaplar", desc: "Yorumlarıma cevap geldiğinde haber ver" },
  { name: "email_suggested_events", label: "Önerilen etkinlikler", desc: "İlgi alanlarınıza göre haftalık öne çıkanlar" },
  { name: "email_new_communities", label: "Yeni topluluklar", desc: "Yakınınızda ilgi alanlarınıza uygun yeni topluluklar" },
  { name: "email_platform_updates", label: "Platform güncellemeleri", desc: "Yeni özellikler ve önemli gelişmeler" },
  { name: "email_surveys", label: "Anketler", desc: "literaslab'i iyileştirmemize yardımcı olacak kısa anketler" },
  { name: "email_connections", label: "Bağlantılar", desc: "Yeni bağlantılar kurduğunuzda haber ver" },
];

export default async function EpostaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("email_messages, email_replies, email_suggested_events, email_new_communities, email_platform_updates, email_surveys, email_connections")
    .eq("id", user.id)
    .single();

  return (
    <>
      <div style={{ font: "500 12px 'IBM Plex Mono', monospace", letterSpacing: "0.08em", color: "rgba(30,58,43,0.55)", textTransform: "lowercase" }}>
        hesap ayarları
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", margin: "6px 0 10px" }}>
        E-posta Güncellemeleri
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.55, color: "rgba(30,58,43,0.7)", margin: "0 0 28px", maxWidth: "56ch" }}>
        Aktiviteniz, etkinlikleriniz ve topluluklarınız hakkında hangi e-postaları alacağınızı seçin.
      </p>

      <form action={updateEposta}>
        {TOGGLES.map((t) => (
          <Toggle key={t.name} name={t.name} label={t.label} desc={t.desc} defaultChecked={(profile as any)?.[t.name] ?? true} />
        ))}

        <button type="submit" style={saveButtonStyle}>
          Değişiklikleri kaydet
        </button>
      </form>

      <hr style={{ border: "none", borderTop: "1px dashed var(--border)", margin: "40px 0 24px" }} />

      <section>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.01em" }}>Tüm e-postaları kapat</h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "rgba(30,58,43,0.7)", margin: "0 0 16px" }}>
          Size e-posta güncellemesi göndermeyi durdururuz. Yasal duyurular gibi zorunlu iletileri almaya devam edersiniz.
        </p>
        <form action={disableAllEmails}>
          <button type="submit" style={{
            padding: "10px 20px",
            border: "1.5px solid var(--ink)",
            borderRadius: 999,
            background: "var(--paper)",
            fontSize: 14, fontWeight: 700,
            color: "var(--ink)",
            cursor: "pointer",
            fontFamily: "inherit",
          }}>
            Tüm e-postaları kapat
          </button>
        </form>
      </section>
    </>
  );
}

function Toggle({ name, label, desc, defaultChecked }: {
  name: string; label: string; desc: string; defaultChecked: boolean;
}) {
  return (
    <label style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "18px 0", borderBottom: "1px solid var(--border)", cursor: "pointer",
    }}>
      <div style={{ flex: 1, paddingRight: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13.5, color: "rgba(30,58,43,0.65)" }}>{desc}</div>
      </div>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} style={{
        appearance: "none",
        width: 44, height: 24,
        borderRadius: 999,
        background: "rgba(30,58,43,0.15)",
        position: "relative",
        cursor: "pointer",
        transition: "background 0.2s",
        flexShrink: 0,
      } as any} className="literas-toggle" />
    </label>
  );
}

const saveButtonStyle = {
  marginTop: 24,
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
