"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { kisiselSchema } from "@/lib/validations";
import { checkUserRateLimit } from "@/lib/rate-limit";
import { ayarlarSonucu, ilkHata } from "@/lib/ayarlar-sonuc";

const YOL = "/ayarlar/kisisel";

export async function updateKisisel(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await checkUserRateLimit(user.id, "normal"))) {
    return ayarlarSonucu(YOL, "Çok fazla istek, biraz bekle");
  }

  // Chip grupları değerleri virgülle ayrılmış tek bir alanda gönderiyor.
  const listeyeCevir = (alan: string) =>
    ((formData.get(alan) as string) || "").split(",").filter(Boolean);

  // Eskiden doğrulama yoktu: gender'a keyfi string, listelere keyfi değer
  // yazılabiliyor, birth_date hiç kontrol edilmiyordu.
  const parsed = kisiselSchema.safeParse({
    birth_date: formData.get("birth_date"),
    gender: formData.get("gender") || "unspecified",
    looking_for: listeyeCevir("looking_for"),
    life_stages: listeyeCevir("life_stages"),
  });
  if (!parsed.success) {
    return ayarlarSonucu(YOL, ilkHata(parsed.error.flatten().fieldErrors));
  }

  const { birth_date, gender, looking_for, life_stages } = parsed.data;

  const { error } = await supabase
    .from("profiles")
    .update({ birth_date: birth_date ?? null, gender, looking_for, life_stages })
    .eq("id", user.id);

  if (error) {
    console.error("[ayarlar/kisisel] güncellenemedi:", error);
    return ayarlarSonucu(YOL, "Kaydedilemedi, lütfen tekrar dene");
  }

  revalidatePath(YOL);
  ayarlarSonucu(YOL);
}
