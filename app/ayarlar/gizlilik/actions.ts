"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { gizlilikSchema } from "@/lib/validations";
import { checkUserRateLimit } from "@/lib/rate-limit";
import { ayarlarSonucu, ilkHata } from "@/lib/ayarlar-sonuc";

const YOL = "/ayarlar/gizlilik";

export async function updatePrivacy(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await checkUserRateLimit(user.id, "normal"))) {
    return ayarlarSonucu(YOL, "Çok fazla istek, biraz bekle");
  }

  // Eskiden enum kontrolü yoktu: keyfi bir string DB'ye giriyordu ve
  // public_profiles görünümündeki gizlilik filtresini sessizce bozabiliyordu.
  const parsed = gizlilikSchema.safeParse({
    contact_permission: formData.get("contact_permission"),
    profile_visibility: formData.get("profile_visibility"),
  });
  if (!parsed.success) {
    return ayarlarSonucu(YOL, ilkHata(parsed.error.flatten().fieldErrors));
  }

  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id);

  if (error) {
    console.error("[ayarlar/gizlilik] güncellenemedi:", error);
    return ayarlarSonucu(YOL, "Kaydedilemedi, lütfen tekrar dene");
  }

  revalidatePath(YOL);
  ayarlarSonucu(YOL);
}
