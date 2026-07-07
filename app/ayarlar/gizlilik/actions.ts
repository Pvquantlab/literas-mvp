"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updatePrivacy(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const updates = {
    contact_permission: (formData.get("contact_permission") as string) || "community_members",
    profile_visibility: (formData.get("profile_visibility") as string) || "public",
  };

  await supabase.from("profiles").update(updates).eq("id", user.id);
  revalidatePath("/ayarlar/gizlilik");
}