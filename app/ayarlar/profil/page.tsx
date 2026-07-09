import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { updateProfile } from "./actions";
import AvatarEditor from "./avatar-editor";

export default async function ProfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const initial = (profile?.name || user.email || "?").charAt(0).toUpperCase();

  return (
    <>
      <div style={{ font: "500 12px 'IBM Plex Mono', monospace", letterSpacing: "0.08em", color: "rgba(30,58,43,0.55)", textTransform: "lowercase" }}>
        hesap ayarları
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", margin: "6px 0 10px" }}>
        Profili Düzenle
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.55, color: "rgba(30,58,43,0.7)", margin: "0 0 28px", maxWidth: "56ch" }}>
        Herkese açık profilinizde görünen bilgileri buradan düzenleyin.
      </p>

      <form action={updateProfile}>
        <AvatarEditor initialUrl={profile?.avatar_url || null} initial={initial} />

        <Field label="Ad Soyad" name="name" defaultValue={profile?.name || ""} />
        <Field label="Kullanıcı adı" name="username" defaultValue={profile?.username || ""} placeholder="@kullaniciadi" />

        <div style={{ marginBottom: 26 }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Hakkında</label>
          <textarea
            name="bio"
            defaultValue={profile?.bio || ""}
            rows={4}
            placeholder="Kendinizden kısaca bahsedin..."
            style={inputStyle}
          />
        </div>

        <Field label="Konum" name="location" defaultValue={profile?.location || ""} placeholder="İstanbul, TR" />

        <button type="submit" style={{
          marginTop: 8,
          padding: "13px 26px",
          background: "var(--lime)",
          border: "2px solid var(--ink)",
          borderRadius: 999,
          fontSize: 14.5, fontWeight: 700,
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

function Field({ label, name, defaultValue, placeholder }: { label: string; name: string; defaultValue: string; placeholder?: string }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <label style={{ display: "block", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{label}</label>
      <input type="text" name={name} defaultValue={defaultValue} placeholder={placeholder} style={inputStyle} />
    </div>
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