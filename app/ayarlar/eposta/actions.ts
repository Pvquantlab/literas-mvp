"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkUserRateLimit } from "@/lib/rate-limit";
import { ayarlarSonucu } from "@/lib/ayarlar-sonuc";

const YOL = "/ayarlar/eposta";

const FIELDS = [
  "email_messages", "email_replies", "email_suggested_events",
  "email_new_communities", "email_platform_updates", "email_surveys", "email_connections",
] as const;

/**
 * "Tüm e-postaları kapat" gerçekten HEPSİNİ kapatmalı.
 *
 * Bu sayfadaki email_* anahtarları henüz gönderilmeyen (mesaj, anket, öneri)
 * bildirimler için. Bugün fiilen gönderilen üç mail push_* anahtarlarına
 * bağlı — DB'deki email_izni() bunları okuyor. Buton o üçünü de kapatmazsa
 * kullanıcı "kapattım" der, mail almaya devam ederdi.
 *
 * İşlemsel mailler (bekleme listesi terfisi, etkinlik değişikliği/iptali)
 * bilinçli olarak kapanmaz: kapatılabilseydi kullanıcı iptal edilmiş bir
 * etkinliğe giderdi. Hesabı dondurmak bunları da durdurur.
 */
const EPOSTA_KAPISI_OLAN_PUSH_ALANLARI = [
  "email_event_reminders", "email_new_members", "email_community_announcements",
] as const;

export async function updateEposta(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await checkUserRateLimit(user.id, "normal"))) {
    return ayarlarSonucu(YOL, "Çok fazla istek, biraz bekle");
  }

  const updates: Record<string, boolean> = {};
  for (const field of FIELDS) {
    updates[field] = formData.get(field) === "on";
  }

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) {
    console.error("[ayarlar/eposta] güncellenemedi:", error);
    return ayarlarSonucu(YOL, "Kaydedilemedi, lütfen tekrar dene");
  }

  revalidatePath(YOL);
  ayarlarSonucu(YOL);
}

export async function disableAllEmails() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await checkUserRateLimit(user.id, "normal"))) {
    return ayarlarSonucu(YOL, "Çok fazla istek, biraz bekle");
  }

  const updates: Record<string, boolean> = {};
  for (const field of FIELDS) updates[field] = false;
  for (const field of EPOSTA_KAPISI_OLAN_PUSH_ALANLARI) updates[field] = false;

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) {
    console.error("[ayarlar/eposta] tüm e-postalar kapatılamadı:", error);
    return ayarlarSonucu(YOL, "Kapatılamadı, lütfen tekrar dene");
  }

  revalidatePath(YOL);
  revalidatePath("/ayarlar/bildirimler");
  ayarlarSonucu(YOL);
}
