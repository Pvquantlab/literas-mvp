"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateKisisel(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const lookingForRaw = (formData.get("looking_for") as string) || "";
  const lifeStagesRaw = (formData.get("life_stages") as string) || "";

  const updates = {
    birth_date: (formData.get("birth_date") as string) || null,
    gender: (formData.get("gender") as string) || "unspecified",
    looking_for: lookingForRaw ? lookingForRaw.split(",").filter(Boolean) : [],
    life_stages: lifeStagesRaw ? lifeStagesRaw.split(",").filter(Boolean) : [],
  };

  await supabase.from("profiles").update(updates).eq("id", user.id);
  revalidatePath("/ayarlar/kisisel");
}
