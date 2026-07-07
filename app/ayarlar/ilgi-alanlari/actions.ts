"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateIlgiAlanlari(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const interestsRaw = (formData.get("interests") as string) || "";
  const distance = parseInt((formData.get("match_distance_km") as string) || "80");

  const updates = {
    interests: interestsRaw ? interestsRaw.split("|").filter(Boolean) : [],
    match_distance_km: isNaN(distance) ? 80 : distance,
  };

  await supabase.from("profiles").update(updates).eq("id", user.id);
  revalidatePath("/ayarlar/ilgi-alanlari");
}
