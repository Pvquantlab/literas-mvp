import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { updatePrivacy } from "./actions";
import AyarlarDurum from "@/components/ayarlar-durum";

export default async function GizlilikPage({
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
    .select("contact_permission, profile_visibility, show_participation")
    .eq("id", user.id)
    .single();

  return (
    <>
      <div style={{ font: "500 12px 'IBM Plex Mono', monospace", letterSpacing: "0.08em", color: "var(--muted)", textTransform: "lowercase" }}>
        hesap ayarları
      </div>
      <h1 style={{ fontFamily: "var(--font-serif), Georgia, serif", fontSize: 32, fontWeight: 400, letterSpacing: ".02em", margin: "6px 0 10px" }}>
        Gizlilik
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--muted)", margin: "0 0 28px", maxWidth: "56ch" }}>
        Sizinle kimlerin iletişim kurabileceğini ve profilinizde nelerin görüneceğini kontrol edin.
      </p>

      <AyarlarDurum durum={durum} hata={hata} />

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
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>
            Gizli profiller arama sonuçlarında ve üye listelerinde görünmez.
          </p>
        </div>

        <div style={{ marginBottom: 26 }}>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, cursor: "pointer" }}>
            <span style={{ flex: 1 }}>
              <span style={{ ...labelStyle, marginBottom: 4 }}>Katılım bilgim profilimde görünsün</span>
              <span style={{ display: "block", fontSize: 13, color: "var(--muted)" }}>
                Kapalıyken <strong>profil sayfanda</strong> katılım sayaçların,
                toplulukların ve etkinlik listelerin başkalarına görünmez. Sen
                kendi profilinde her zaman görürsün.
              </span>
              <span style={{ display: "block", fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>
                Bu ayar profil sayfanı kapsar. Katıldığın bir etkinliğin
                katılımcı listesinde ya da üyesi olduğun bir topluluğun üye
                listesinde adın görünmeye devam eder.
              </span>
            </span>
            <input
              type="checkbox"
              name="show_participation"
              defaultChecked={profile?.show_participation ?? true}
              className="literas-toggle"
              style={{
                appearance: "none",
                width: 44,
                height: 24,
                borderRadius: 999,
                background: "var(--paper-soft)",
                position: "relative",
                cursor: "pointer",
                transition: "background 0.2s",
                flexShrink: 0,
              } as React.CSSProperties}
            />
          </label>
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
const labelStyle = { display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8 };
const saveButtonStyle = {
  marginTop: 8,
  padding: "13px 26px",
  background: "var(--lime)",
  border: "2px solid var(--ink)",
  borderRadius: 999,
  fontSize: 14.5,
  fontWeight: 500,
  color: "var(--ink)",
  cursor: "pointer",
};