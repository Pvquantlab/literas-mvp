"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkUserRateLimit } from "@/lib/rate-limit";
import { ayarlarSonucu } from "@/lib/ayarlar-sonuc";

const YOL = "/ayarlar/bildirimler";

/**
 * Bu anahtarlar fiilen E-POSTA gönderimini yönetiyor (platformda push
 * altyapısı yok). Hangisinin hangi maili kapattığı DB'deki email_izni()
 * fonksiyonunda tanımlı:
 *   email_event_reminders         → etkinlik hatırlatması
 *   email_new_members             → topluluğuna katılım isteği
 *   email_community_announcements → topluluğunda yeni etkinlik
 * Diğer ikisi henüz var olmayan özellikler için saklanıyor.
 */
const FIELDS = [
  "push_new_messages", "email_event_reminders", "email_community_announcements",
  "email_new_members", "push_suggested_events",
] as const;

export async function updateBildirimler(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await checkUserRateLimit(user.id, "normal"))) {
    return ayarlarSonucu(YOL, "Çok fazla istek, biraz bekle");
  }

  // İşaretsiz checkbox gönderilmez; yokluğu "kapalı" demektir.
  const updates: Record<string, boolean> = {};
  for (const field of FIELDS) {
    updates[field] = formData.get(field) === "on";
  }

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) {
    console.error("[ayarlar/bildirimler] güncellenemedi:", error);
    return ayarlarSonucu(YOL, "Kaydedilemedi, lütfen tekrar dene");
  }

  revalidatePath(YOL);
  ayarlarSonucu(YOL);
}
