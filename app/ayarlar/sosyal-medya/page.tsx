import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { updateSosyalMedya } from "./actions";

export default async function SosyalMedyaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("instagram_url, x_url, youtube_url, linkedin_url")
    .eq("id", user.id)
    .single();

  return (
    <>
      <div style={{ font: "500 12px 'IBM Plex Mono', monospace", letterSpacing: "0.08em", color: "rgba(30,58,43,0.55)", textTransform: "lowercase" }}>
        hesap ayarları
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", margin: "6px 0 10px" }}>
        Sosyal Medya
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.55, color: "rgba(30,58,43,0.7)", margin: "0 0 28px", maxWidth: "56ch" }}>
        Hesaplarınızı ekleyin; topluluk profillerinizde bağlantı olarak gösterilir.
      </p>

      <form action={updateSosyalMedya}>
        <SocialField label="Instagram" name="instagram_url" icon="📷" defaultValue={profile?.instagram_url} placeholder="https://instagram.com/kullaniciadiniz" />
        <SocialField label="X" name="x_url" icon="✕" defaultValue={profile?.x_url} placeholder="https://x.com/kullaniciadiniz" />
        <SocialField label="YouTube" name="youtube_url" icon="▶" defaultValue={profile?.youtube_url} placeholder="https://youtube.com/@kanaliniz" />
        <SocialField label="LinkedIn" name="linkedin_url" icon="in" defaultValue={profile?.linkedin_url} placeholder="https://linkedin.com/in/adiniz" />

        <button type="submit" style={saveButtonStyle}>
          Değişiklikleri kaydet
        </button>
      </form>
    </>
  );
}

function SocialField({ label, name, icon, defaultValue, placeholder }: {
  label: string; name: string; icon: string; defaultValue?: string | null; placeholder: string;
}) {
  return (
    <div style={{ marginBottom: 22 }}>
      <label style={{ display: "block", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", border: "1.5px solid var(--border)", borderRadius: 12, background: "var(--paper-cream)", overflow: "hidden" }}>
        <div style={{ width: 44, height: 44, display: "grid", placeItems: "center", fontSize: 16, fontWeight: 700, color: "var(--ink)", borderRight: "1px solid var(--border)" }}>
          {icon}
        </div>
        <input
          type="url"
          name={name}
          defaultValue={defaultValue || ""}
          placeholder={placeholder}
          style={{
            flex: 1, padding: "12px 14px", border: "none", background: "transparent",
            fontSize: 14.5, color: "var(--ink)", outline: "none", fontFamily: "inherit",
          }}
        />
      </div>
    </div>
  );
}

const saveButtonStyle = {
  marginTop: 12,
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
