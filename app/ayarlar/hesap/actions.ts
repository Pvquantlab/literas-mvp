"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateAccount(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const updates = {
    email: (formData.get("email") as string)?.trim() || null,
    language: (formData.get("language") as string) || "tr",
    timezone: (formData.get("timezone") as string) || "Europe/Istanbul",
  };

  await supabase.from("profiles").update(updates).eq("id", user.id);
  revalidatePath("/ayarlar/hesap");
}

export async function deactivateAccount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("profiles").update({ account_active: false }).eq("id", user.id);
  await supabase.auth.signOut();
  redirect("/");
}