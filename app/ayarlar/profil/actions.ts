"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const avatarRaw = (formData.get("avatar_url") as string)?.trim();

  const updates = {
    name: (formData.get("name") as string)?.trim() || null,
    username: (formData.get("username") as string)?.trim().replace(/^@/, "") || null,
    bio: (formData.get("bio") as string)?.trim() || null,
    location: (formData.get("location") as string)?.trim() || null,
    avatar_url: avatarRaw ? avatarRaw : null,
  };

  await supabase.from("profiles").update(updates).eq("id", user.id);
  revalidatePath("/ayarlar/profil");
  revalidatePath(`/profile/${user.id}`);
}
