import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import AyarlarDurum from "@/components/ayarlar-durum";
import { updateIlgiAlanlari } from "./actions";
import InterestPicker from "./interest-picker";

// HER ETİKET `topics` TABLOSUNDA BİREBİR KARŞILIĞI OLAN BİR ADDIR.
// Eskiden altısı (Kahve Tadımı, Kitap + Kahve, Vinil Plak, Bisiklet Turu,
// Dil Pratiği, Fotoğraf Yürüyüşü) hiçbir konuya çözülmüyordu — ne birebir ne
// önekle. `topics` kapalı bir tohum kümesi (RLS'te INSERT politikası yok,
// sihirbaz yalnızca seçtiriyor), yani katalog ne kadar büyürse büyüsün o altı
// çip SONSUZA KADAR sıfır sonuç verecekti: uygulamanın kendi önerdiği etiketi
// seçen kullanıcı hiçbir şey görmüyordu.
//
// KALICI ÇÖZÜM AYRI TUR: bu dizi elle yazılmayı bırakıp `topics`ten
// türetilmeli (sayfa zaten sunucu bileşeni, getPopularTopics() çağrılabilir).
// O zaman "önerilen çip hiçbir konuya çözülmüyor" durumu yapısal olarak
// imkânsız olur.
const SUGGESTED_INTERESTS = [
  "Şiir", "Kısa Öykü", "Felsefe", "Kahve", "Doğa Yürüyüşü",
  "Fotoğrafçılık", "Tiyatro", "Bağımsız Sinema", "Podcast", "Yaratıcı Yazarlık",
  "Kitap Kulübü", "Edebiyat", "Kahve ve Kitaplar", "Fotoğraf Gezileri", "Dil ve Kültür",
  "Müze", "Sergi", "Konser", "Plak Koleksiyonculuğu", "Bisiklet",
];

export default async function IlgiAlanlariPage({
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
    .select("interests, match_distance_km")
    .eq("id", user.id)
    .single();

  return (
    <>
      <div style={{ font: "500 12px 'IBM Plex Mono', monospace", letterSpacing: "0.08em", color: "var(--muted)", textTransform: "lowercase" }}>
        hesap ayarları
      </div>
      <h1 style={{ fontFamily: "var(--font-serif), Georgia, serif", fontSize: 32, fontWeight: 400, letterSpacing: ".02em", margin: "6px 0 10px" }}>
        İlgi Alanları
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--muted)", margin: "0 0 28px", maxWidth: "56ch" }}>
        Seçtiğiniz ilgi alanlarına uyan toplulukları ana sayfanızda öneririz.
      </p>

      <AyarlarDurum durum={durum} hata={hata} />

      <form action={updateIlgiAlanlari}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <span style={{ font: "500 12px 'IBM Plex Mono', monospace", letterSpacing: "0.05em", color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}>
            eşleşme mesafesi:
            {/* match_distance_km yazılıyor ama HİÇBİR sorguda okunmuyor:
                topluluklarda koordinat yok, yalnızca serbest metin şehir var,
                dolayısıyla mesafe bugün hesaplanamıyor. Sözü tutulmayan bir
                ayarı sessiz bırakmak yerine işaretliyoruz — ayarlar/bildirimler
                sayfasındaki kalıbın aynısı. */}
            <span style={{
              font: "500 10.5px 'IBM Plex Mono', monospace",
              letterSpacing: "0.08em",
              textTransform: "lowercase",
              padding: "2px 7px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              color: "var(--muted)",
            }}>
              yakında
            </span>
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
  fontWeight: 500,
  color: "var(--ink)",
  cursor: "pointer",
};
