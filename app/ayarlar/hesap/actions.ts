"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hesapSchema } from "@/lib/validations";
import { checkUserRateLimit } from "@/lib/rate-limit";
import { ayarlarSonucu, ilkHata } from "@/lib/ayarlar-sonuc";

const YOL = "/ayarlar/hesap";

export async function updateAccount(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await checkUserRateLimit(user.id, "normal"))) {
    return ayarlarSonucu(YOL, "Çok fazla istek, biraz bekle");
  }

  // email BİLİNÇLİ olarak alınmıyor. profiles.email giden tüm postanın
  // kaynağı (get_member_emails, get_event_rsvp_emails, claim_email_outbox) ve
  // doğrulamasız değiştirilebilmesi kullanıcının başkasının adresine bildirim
  // akıtmasına izin veriyordu. Kolon artık profiles_guard trigger'ı ile de
  // kilitli; değişim Supabase auth doğrulama akışından geçmeli.
  const parsed = hesapSchema.safeParse({
    language: formData.get("language"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) {
    return ayarlarSonucu(YOL, ilkHata(parsed.error.flatten().fieldErrors));
  }

  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id);

  if (error) {
    console.error("[ayarlar/hesap] güncellenemedi:", error);
    return ayarlarSonucu(YOL, "Kaydedilemedi, lütfen tekrar dene");
  }

  revalidatePath(YOL);
  ayarlarSonucu(YOL);
}

export async function deactivateAccount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ account_active: false })
    .eq("id", user.id);

  if (error) {
    console.error("[ayarlar/hesap] hesap dondurulamadı:", error);
    return ayarlarSonucu(YOL, "Hesap dondurulamadı, lütfen tekrar dene");
  }

  await supabase.auth.signOut();
  redirect("/");
}
