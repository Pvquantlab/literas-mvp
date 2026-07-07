"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const FIELDS = [
  "email_messages", "email_replies", "email_suggested_events",
  "email_new_communities", "email_platform_updates", "email_surveys", "email_connections",
];

export async function updateEposta(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const updates: Record<string, boolean> = {};
  for (const field of FIELDS) {
    updates[field] = formData.get(field) === "on";
  }

  await supabase.from("profiles").update(updates).eq("id", user.id);
  revalidatePath("/ayarlar/eposta");
}

export async function disableAllEmails() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const updates: Record<string, boolean> = {};
  for (const field of FIELDS) updates[field] = false;

  await supabase.from("profiles").update(updates).eq("id", user.id);
  revalidatePath("/ayarlar/eposta");
}
