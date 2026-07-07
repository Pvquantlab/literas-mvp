import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { updateBildirimler } from "./actions";

const TOGGLES = [
  { name: "push_new_messages", label: "Yeni mesajlar", desc: "Biri size mesaj gönderdiğinde bildirim al" },
  { name: "push_event_reminders", label: "Etkinlik hatırlatıcıları", desc: "Katılacağınız etkinliklerden önce hatırlatma" },
  { name: "push_community_announcements", label: "Topluluk duyuruları", desc: "Üyesi olduğunuz topluluklardan duyurular" },
  { name: "push_new_members", label: "Yeni üye katılımları", desc: "Yönettiğiniz topluluklara yeni üye katıldığında" },
  { name: "push_suggested_events", label: "Önerilen etkinlikler", desc: "Size uygun olabilecek etkinlik önerileri" },
];

export default async function BildirimlerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("push_new_messages, push_event_reminders, push_community_announcements, push_new_members, push_suggested_events")
    .eq("id", user.id)
    .single();

  return (
    <>
      <div style={{ font: "500 12px 'IBM Plex Mono', monospace", letterSpacing: "0.08em", color: "rgba(30,58,43,0.55)", textTransform: "lowercase" }}>
        hesap ayarları
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", margin: "6px 0 10px" }}>
        Bildirimler
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.55, color: "rgba(30,58,43,0.7)", margin: "0 0 28px", maxWidth: "56ch" }}>
        Telefonunuza ve tarayıcınıza gönderilen push bildirimlerini yönetin.
      </p>

      <form action={updateBildirimler}>
        {TOGGLES.map((t) => (
          <label key={t.name} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 0", borderBottom: "1px solid var(--border)", cursor: "pointer",
          }}>
            <div style={{ flex: 1, paddingRight: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{t.label}</div>
              <div style={{ fontSize: 13.5, color: "rgba(30,58,43,0.65)" }}>{t.desc}</div>
            </div>
            <input type="checkbox" name={t.name} defaultChecked={(profile as any)?.[t.name] ?? true} className="literas-toggle" style={{
              appearance: "none",
              width: 44, height: 24,
              borderRadius: 999,
              background: "rgba(30,58,43,0.15)",
              position: "relative",
              cursor: "pointer",
              transition: "background 0.2s",
              flexShrink: 0,
            } as any} />
          </label>
        ))}

        <button type="submit" style={{
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
        }}>
          Değişiklikleri kaydet
        </button>
      </form>
    </>
  );
}
