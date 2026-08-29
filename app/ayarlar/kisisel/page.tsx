import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import AyarlarDurum from "@/components/ayarlar-durum";
import { updateKisisel } from "./actions";
import ChipGroup from "./chip-group";

const LOOKING_FOR_OPTIONS = [
  { value: "hobbies", label: "🎨 Hobilerimle ilgilenmek" },
  { value: "socialize", label: "💬 Sosyalleşmek" },
  { value: "friends", label: "👋 Arkadaş edinmek" },
  { value: "networking", label: "💼 Profesyonel ağ kurma" },
];

const LIFE_STAGE_OPTIONS = [
  { value: "graduate", label: "🎓 Yeni mezun" },
  { value: "student", label: "📚 Öğrenci" },
  { value: "new_in_town", label: "📍 Şehirde yeni" },
  { value: "new_parent", label: "👶 Yeni ebeveyn" },
  { value: "retired", label: "🌿 Yeni emekli" },
  { value: "career_change", label: "🔄 Kariyer değişikliği" },
];

export default async function KisiselPage({
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
    .select("birth_date, gender, looking_for, life_stages")
    .eq("id", user.id)
    .single();

  return (
    <>
      <div style={{ font: "500 12px 'IBM Plex Mono', monospace", letterSpacing: "0.08em", color: "var(--muted)", textTransform: "lowercase" }}>
        hesap ayarları
      </div>
      <h1 style={{ fontFamily: "var(--font-serif), Georgia, serif", fontSize: 32, fontWeight: 400, letterSpacing: ".02em", margin: "6px 0 10px" }}>
        Kişisel Bilgiler
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--muted)", margin: "0 0 28px", maxWidth: "56ch" }}>
        Bu bilgiler topluluk önerilerini iyileştirmemize yardımcı olur. Doğum tarihiniz ve cinsiyetiniz profilinizde görünmez.
      </p>

      <AyarlarDurum durum={durum} hata={hata} />

      <form action={updateKisisel}>
        <div style={{ marginBottom: 26 }}>
          <label style={labelStyle}>Doğum tarihi</label>
          <input type="date" name="birth_date" defaultValue={profile?.birth_date || ""} style={inputStyle} />
        </div>

        <div style={{ marginBottom: 30 }}>
          <label style={labelStyle}>Cinsiyet</label>
          <select name="gender" defaultValue={profile?.gender || "unspecified"} style={inputStyle}>
            <option value="unspecified">Belirtmek istemiyorum</option>
            <option value="woman">Kadın</option>
            <option value="man">Erkek</option>
            <option value="non_binary">İkili olmayan</option>
          </select>
        </div>

        <div style={{ marginBottom: 30 }}>
          <label style={labelStyle}>Ne arıyorsunuz?</label>
          <ChipGroup name="looking_for" options={LOOKING_FOR_OPTIONS} defaultValue={profile?.looking_for || []} />
        </div>

        <div style={{ marginBottom: 30 }}>
          <label style={labelStyle}>Yaşam evreleri</label>
          <ChipGroup name="life_stages" options={LIFE_STAGE_OPTIONS} defaultValue={profile?.life_stages || []} />
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
};
const labelStyle = { display: "block", fontSize: 14, fontWeight: 500, marginBottom: 10 };
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
