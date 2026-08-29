import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { updateEposta, disableAllEmails } from "./actions";
import AyarlarDurum from "@/components/ayarlar-durum";

const TOGGLES = [
  { name: "email_messages", label: "Mesajlar", desc: "Bana mesaj gönderildiğinde e-postayla bilgilendir" },
  { name: "email_replies", label: "Yorumlara verilen cevaplar", desc: "Yorumlarıma cevap geldiğinde haber ver" },
  { name: "email_suggested_events", label: "Önerilen etkinlikler", desc: "İlgi alanlarınıza göre haftalık öne çıkanlar" },
  { name: "email_new_communities", label: "Yeni topluluklar", desc: "Yakınınızda ilgi alanlarınıza uygun yeni topluluklar" },
  { name: "email_platform_updates", label: "Platform güncellemeleri", desc: "Yeni özellikler ve önemli gelişmeler" },
  { name: "email_surveys", label: "Anketler", desc: "literaslab'i iyileştirmemize yardımcı olacak kısa anketler" },
  { name: "email_connections", label: "Bağlantılar", desc: "Yeni bağlantılar kurduğunuzda haber ver" },
];

export default async function EpostaPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; hata?: string }>;
}) {
  const { durum, hata } = await searchParams;
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
      <div style={{ font: "500 12px 'IBM Plex Mono', monospace", letterSpacing: "0.08em", color: "var(--muted)", textTransform: "lowercase" }}>
        hesap ayarları
      </div>
      <h1 style={{ fontFamily: "var(--font-serif), Georgia, serif", fontSize: 32, fontWeight: 400, letterSpacing: ".02em", margin: "6px 0 10px" }}>
        E-posta Güncellemeleri
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--muted)", margin: "0 0 28px", maxWidth: "56ch" }}>
        Aktiviteniz, etkinlikleriniz ve topluluklarınız hakkında hangi e-postaları alacağınızı seçin.
      </p>

      <AyarlarDurum durum={durum} hata={hata} />

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
        <h2 style={{ fontSize: 18, fontWeight: 400, margin: "0 0 8px", letterSpacing: ".02em" }}>Tüm e-postaları kapat</h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--muted)", margin: "0 0 16px" }}>
          Bu sayfadaki tercihlerin yanı sıra etkinlik hatırlatmaları, katılım
          istekleri ve topluluk duyurularını da kapatırız.
          Yalnızca sizi doğrudan ilgilendiren iletiler gelmeye devam eder:
          katıldığınız bir etkinlik iptal edilir veya saati değişirse, ya da
          bekleme listesinden yeriniz açılırsa. Bunları da durdurmak için
          hesabınızı dondurabilirsiniz.
        </p>
        <form action={disableAllEmails}>
          <button type="submit" style={{
            padding: "10px 20px",
            border: "1.5px solid var(--ink)",
            borderRadius: 999,
            background: "var(--paper)",
            fontSize: 14, fontWeight: 500,
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
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13.5, color: "var(--muted)" }}>{desc}</div>
      </div>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} style={{
        appearance: "none",
        width: 44, height: 24,
        borderRadius: 999,
        background: "var(--paper-soft)",
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
  fontWeight: 500,
  color: "var(--ink)",
  cursor: "pointer",
};
