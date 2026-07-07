import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { updateProfile } from "./actions";

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
        {/* Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 30 }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "var(--lime)",
            display: "grid", placeItems: "center",
            fontSize: 28, fontWeight: 800, color: "var(--ink)",
            border: "2px solid var(--ink)",
          }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              initial
            )}
          </div>
          <button type="button" disabled style={{
            padding: "10px 18px",
            border: "1.5px solid var(--ink)",
            borderRadius: 999,
            background: "var(--paper)",
            fontSize: 14, fontWeight: 600,
            color: "rgba(30,58,43,0.4)",
            cursor: "not-allowed",
          }}>
            Fotoğrafı değiştir (yakında)
          </button>
        </div>

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