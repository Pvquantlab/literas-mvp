"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ilgiAlanlariSchema } from "@/lib/validations";
import { checkUserRateLimit } from "@/lib/rate-limit";
import { ayarlarSonucu, ilkHata } from "@/lib/ayarlar-sonuc";

const YOL = "/ayarlar/ilgi-alanlari";

export async function updateIlgiAlanlari(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await checkUserRateLimit(user.id, "normal"))) {
    return ayarlarSonucu(YOL, "Çok fazla istek, biraz bekle");
  }

  // İlgi alanları "|" ile ayrılmış tek alanda geliyor (etiketler virgül
  // içerebildiği için ayraç virgül değil).
  const interestsRaw = ((formData.get("interests") as string) || "")
    .split("|")
    .filter(Boolean);

  // Eskiden sınır yoktu: sayısı ve uzunluğu kontrolsüzdü, mesafe NaN gelirse
  // sessizce 80'e düşüyordu.
  const parsed = ilgiAlanlariSchema.safeParse({
    interests: interestsRaw,
    match_distance_km: formData.get("match_distance_km") || 80,
  });
  if (!parsed.success) {
    return ayarlarSonucu(YOL, ilkHata(parsed.error.flatten().fieldErrors));
  }

  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id);

  if (error) {
    console.error("[ayarlar/ilgi-alanlari] güncellenemedi:", error);
    return ayarlarSonucu(YOL, "Kaydedilemedi, lütfen tekrar dene");
  }

  revalidatePath(YOL);
  // Ana sayfa artık bu kolonu OKUYOR (ilgi_onerileri). Sayfa dinamik olduğu
  // için bugün davranış değişmiyor; niyeti yazılı bırakıyoruz ki ileride
  // ana sayfa önbelleğe alınırsa öneriler bayat kalmasın.
  revalidatePath("/");
  ayarlarSonucu(YOL);
}
