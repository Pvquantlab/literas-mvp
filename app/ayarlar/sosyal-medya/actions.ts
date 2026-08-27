"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sosyalMedyaSchema } from "@/lib/validations";
import { checkUserRateLimit } from "@/lib/rate-limit";
import { ayarlarSonucu, ilkHata } from "@/lib/ayarlar-sonuc";

const YOL = "/ayarlar/sosyal-medya";

export async function updateSosyalMedya(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await checkUserRateLimit(user.id, "normal"))) {
    return ayarlarSonucu(YOL, "Çok fazla istek, biraz bekle");
  }

  // Eskiden hiçbir doğrulama yoktu: "javascript:alert(1)" kaydedilebiliyordu
  // ve profilde bağlantı olarak render edildiğinde XSS'e dönüşüyordu.
  const parsed = sosyalMedyaSchema.safeParse({
    instagram_url: formData.get("instagram_url"),
    x_url: formData.get("x_url"),
    youtube_url: formData.get("youtube_url"),
    linkedin_url: formData.get("linkedin_url"),
  });
  if (!parsed.success) {
    return ayarlarSonucu(YOL, ilkHata(parsed.error.flatten().fieldErrors));
  }

  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id);

  if (error) {
    console.error("[ayarlar/sosyal-medya] güncellenemedi:", error);
    return ayarlarSonucu(YOL, "Kaydedilemedi, lütfen tekrar dene");
  }

  revalidatePath(YOL);
  ayarlarSonucu(YOL);
}
