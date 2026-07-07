import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { updatePrivacy } from "./actions";

export default async function GizlilikPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("contact_permission, profile_visibility")
    .eq("id", user.id)
    .single();

  return (
    <>
      <div style={{ font: "500 12px 'IBM Plex Mono', monospace", letterSpacing: "0.08em", color: "rgba(30,58,43,0.55)", textTransform: "lowercase" }}>
        hesap ayarları
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", margin: "6px 0 10px" }}>
        Gizlilik
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.55, color: "rgba(30,58,43,0.7)", margin: "0 0 28px", maxWidth: "56ch" }}>
        Sizinle kimlerin iletişim kurabileceğini ve profilinizde nelerin görüneceğini kontrol edin.
      </p>

      <form action={updatePrivacy}>
        <div style={{ marginBottom: 26 }}>
          <label style={labelStyle}>Sizinle kimler iletişim kurabilir?</label>
          <select name="contact_permission" defaultValue={profile?.contact_permission || "community_members"} style={inputStyle}>
            <option value="everyone">Herkes</option>
            <option value="community_members">Sadece topluluklarımın üyeleri</option>
            <option value="nobody">Kimse</option>
          </select>
        </div>

        <div style={{ marginBottom: 26 }}>
          <label style={labelStyle}>Profil görünürlüğü</label>
          <select name="profile_visibility" defaultValue={profile?.profile_visibility || "public"} style={inputStyle}>
            <option value="public">Herkese açık</option>
            <option value="private">Gizli</option>
          </select>
          <p style={{ fontSize: 13, color: "rgba(30,58,43,0.6)", marginTop: 8 }}>
            Gizli profiller arama sonuçlarında ve üye listelerinde görünmez.
          </p>
        </div>

        <button type="submit" style={saveButtonStyle}>
          Değişiklikleri kaydet
        </button>
      </form>
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
  cursor: "pointer",
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