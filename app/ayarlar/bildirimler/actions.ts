"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const FIELDS = [
  "push_new_messages", "push_event_reminders", "push_community_announcements",
  "push_new_members", "push_suggested_events",
];

export async function updateBildirimler(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const updates: Record<string, boolean> = {};
  for (const field of FIELDS) {
    updates[field] = formData.get(field) === "on";
  }

  await supabase.from("profiles").update(updates).eq("id", user.id);
  revalidatePath("/ayarlar/bildirimler");
}
