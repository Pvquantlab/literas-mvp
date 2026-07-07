import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { updateIlgiAlanlari } from "./actions";
import InterestPicker from "./interest-picker";

const SUGGESTED_INTERESTS = [
  "Şiir", "Kısa Öykü", "Felsefe", "Kahve Tadımı", "Doğa Yürüyüşü",
  "Fotoğrafçılık", "Tiyatro", "Bağımsız Sinema", "Podcast", "Yaratıcı Yazarlık",
  "Kitap Kulübü", "Edebiyat", "Kitap + Kahve", "Fotoğraf Yürüyüşü", "Dil Pratiği",
  "Müze", "Sergi", "Konser", "Vinil Plak", "Bisiklet Turu",
];

export default async function IlgiAlanlariPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("interests, match_distance_km")
    .eq("id", user.id)
    .single();

  return (
    <>
      <div style={{ font: "500 12px 'IBM Plex Mono', monospace", letterSpacing: "0.08em", color: "rgba(30,58,43,0.55)", textTransform: "lowercase" }}>
        hesap ayarları
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", margin: "6px 0 10px" }}>
        İlgi Alanları
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.55, color: "rgba(30,58,43,0.7)", margin: "0 0 28px", maxWidth: "56ch" }}>
        Favori ilgi alanlarınızı seçin; size yakın toplulukları bunlara göre önerelim.
      </p>

      <form action={updateIlgiAlanlari}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <span style={{ font: "500 12px 'IBM Plex Mono', monospace", letterSpacing: "0.05em", color: "rgba(30,58,43,0.65)" }}>
            eşleşme mesafesi:
          </span>
          <select name="match_distance_km" defaultValue={profile?.match_distance_km || 80} style={{
            padding: "8px 14px",
            border: "1.5px solid var(--border)",
            borderRadius: 999,
            background: "var(--paper-cream)",
            fontSize: 13.5, fontWeight: 600,
            color: "var(--ink)",
            fontFamily: "inherit",
            cursor: "pointer",
          }}>
            <option value="10">10 km</option>
            <option value="25">25 km</option>
            <option value="50">50 km</option>
            <option value="80">80 km</option>
            <option value="150">150 km</option>
            <option value="500">500 km</option>
          </select>
        </div>

        <InterestPicker
          defaultValue={profile?.interests || []}
          suggested={SUGGESTED_INTERESTS}
        />

        <button type="submit" style={saveButtonStyle}>
          Değişiklikleri kaydet
        </button>
      </form>
    </>
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
