import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import SettingsMenu from "./menu";

export default async function AyarlarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
 const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 28px 60px", display: "flex", gap: 32, alignItems: "flex-start" }}>
      <aside style={{
        position: "sticky",
        top: 16,
        flex: "0 0 260px",
        background: "var(--paper-cream)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        boxShadow: "0 6px 24px rgba(30,58,43,0.07)",
        padding: 10,
      }}>
        <SettingsMenu />
      </aside>

      <main style={{ flex: 1, minWidth: 0, maxWidth: 720, paddingTop: 6 }}>
        {children}
      </main>
    </div>
  );
}
