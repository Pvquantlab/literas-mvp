"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { profilSchema } from "@/lib/validations";
import { checkUserRateLimit } from "@/lib/rate-limit";
import { ayarlarSonucu, ilkHata } from "@/lib/ayarlar-sonuc";

const YOL = "/ayarlar/profil";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await checkUserRateLimit(user.id, "normal"))) {
    return ayarlarSonucu(YOL, "Çok fazla istek, biraz bekle");
  }

  // Eskiden hiçbir doğrulama yoktu: kullanıcı adı biçimi ve uzunluğu
  // kontrolsüzdü ("@admin" alınabiliyordu), bio sınırsızdı.
  const parsed = profilSchema.safeParse({
    name: formData.get("name"),
    username: formData.get("username"),
    bio: formData.get("bio"),
    location: formData.get("location"),
    avatar_url: formData.get("avatar_url"),
  });
  if (!parsed.success) {
    return ayarlarSonucu(YOL, ilkHata(parsed.error.flatten().fieldErrors));
  }

  const { name, username, bio, location, avatar_url } = parsed.data;

  const { error } = await supabase
    .from("profiles")
    .update({
      name,
      username: username ?? null,
      bio: bio || null,
      location: location || null,
      avatar_url: avatar_url ?? null,
    })
    .eq("id", user.id);

  if (error) {
    // 23505 = unique ihlali. profiles.username üzerinde unique index var ama
    // hata yutulduğu için kullanıcı çakışmayı hiç görmüyordu.
    if (error.code === "23505") {
      return ayarlarSonucu(YOL, "Bu kullanıcı adı alınmış, başka bir tane dene");
    }
    console.error("[ayarlar/profil] güncellenemedi:", error);
    return ayarlarSonucu(YOL, "Kaydedilemedi, lütfen tekrar dene");
  }

  revalidatePath(YOL);
  revalidatePath(`/profile/${user.id}`);
  ayarlarSonucu(YOL);
}
