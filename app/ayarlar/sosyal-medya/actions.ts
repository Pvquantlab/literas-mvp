"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateSosyalMedya(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const updates = {
    instagram_url: (formData.get("instagram_url") as string)?.trim() || null,
    x_url: (formData.get("x_url") as string)?.trim() || null,
    youtube_url: (formData.get("youtube_url") as string)?.trim() || null,
    linkedin_url: (formData.get("linkedin_url") as string)?.trim() || null,
  };

  await supabase.from("profiles").update(updates).eq("id", user.id);
  revalidatePath("/ayarlar/sosyal-medya");
}
