import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import CategoryStrip from "./category-strip";
import TabBar from "./tab-bar";

const CATEGORIES = [
  { slug: "kitap", label: "Kitap" },
  { slug: "doga", label: "Doğa" },
  { slug: "muzik", label: "Müzik" },
  { slug: "lezzet", label: "Lezzet" },
  { slug: "dil", label: "Dil" },
  { slug: "spor", label: "Spor" },
  { slug: "sanat", label: "Sanat" },
  { slug: "oyun", label: "Oyun" },
  { slug: "tech", label: "Tech" },
  { slug: "sinema", label: "Sinema" },
  { slug: "fotograf", label: "Fotoğraf" },
  { slug: "gonulluluk", label: "Gönüllülük" },
  { slug: "kariyer", label: "Kariyer" },
  { slug: "sosyal", label: "Sosyal" },
];

type Props = {
  searchParams: Promise<{ tab?: string; kategori?: string }>;
};

export default async function KesfetPage({ searchParams }: Props) {
  const params = await searchParams;
  const activeTab = params.tab === "topluluklar" ? "topluluklar" : "etkinlikler";
  const activeCategory = params.kategori || null;

  const supabase = await createClient();

  let events: any[] = [];
  let communities: any[] = [];

  if (activeTab === "etkinlikler") {
    const query = supabase
      .from("events")
      .select("id, title, date, location, community_id, communities(name, category, cover_image_url, city)")
      .order("date", { ascending: true })
      .limit(24);

    const { data } = await query;
    events = (data || []).filter((e: any) => {
      if (!activeCategory) return true;
      return e.communities?.category === activeCategory;
    });
  } else {
    const query = supabase
      .from("communities")
      .select("id, name, category, description, cover_image_url, city, created_at")
      .order("created_at", { ascending: false })
      .limit(24);

    const { data } = await query;
    communities = (data || []).filter((c: any) => {
      if (!activeCategory) return true;
      return c.category === activeCategory;
    });
  }

  const heading = activeTab === "etkinlikler"
    ? "yakınındaki etkinlikler"
    : "yakınındaki topluluklar";

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 24px 60px" }}>
      <TabBar activeTab={activeTab} activeCategory={activeCategory} />

      <h1 style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontWeight: 700,
        fontSize: "clamp(28px, 4vw, 40px)",
        lineHeight: 1.15,
        letterSpacing: "-0.5px",
        margin: "18px 0 26px",
      }}>
        <span className="highlight-yellow">İstanbul</span> {heading}
      </h1>

      <CategoryStrip
        categories={CATEGORIES}
        activeCategory={activeCategory}
        activeTab={activeTab}
      />

      <div style={{ marginTop: 32 }}>
        {activeTab === "etkinlikler" ? (
          events.length === 0 ? (
            <EmptyState kind="etkinlik" />
          ) : (
            <div style={gridStyle}>
              {events.map((e: any) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          )
        ) : communities.length === 0 ? (
          <EmptyState kind="topluluk" />
        ) : (
          <div style={gridStyle}>
            {communities.map((c: any) => (
              <CommunityCard key={c.id} community={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "28px 20px",
};

function EventCard({ event }: { event: any }) {
  const dateStr = event.date
    ? new Date(event.date).toLocaleDateString("tr-TR", {
        day: "numeric", month: "short", weekday: "short",
        hour: "2-digit", minute: "2-digit",
      })
    : "";

  return (
    <Link href={`/event/${event.id}`} className="card" style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column" }}>
      <div style={{
        position: "relative",
        aspectRatio: "16/10",
        borderRadius: 14,
        overflow: "hidden",
        background: event.communities?.cover_image_url ? "transparent" : "var(--paper-soft)",
      }}>
        {event.communities?.cover_image_url ? (
          <img
            src={event.communities.cover_image_url}
            alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 34, color: "rgba(30,58,43,0.35)" }}>
            📅
          </div>
        )}
      </div>
      <div style={{ padding: "12px 2px 0", display: "flex", flexDirection: "column", gap: 4 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}>{event.title}</h3>
        <div style={{ fontSize: 13.5, color: "rgba(30,58,43,0.65)" }}>{dateStr}</div>
        {event.communities?.name && (
          <div style={{ fontSize: 13, color: "rgba(30,58,43,0.55)", marginTop: 2 }}>
            {event.communities.name}
          </div>
        )}
      </div>
    </Link>
  );
}

function CommunityCard({ community }: { community: any }) {
  return (
    <Link href={`/community/${community.id}`} className="card" style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column" }}>
      <div style={{
        position: "relative",
        aspectRatio: "16/10",
        borderRadius: 14,
        overflow: "hidden",
        background: community.cover_image_url ? "transparent" : "var(--paper-soft)",
      }}>
        {community.cover_image_url ? (
          <img
            src={community.cover_image_url}
            alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 34, color: "rgba(30,58,43,0.35)" }}>
            📖
          </div>
        )}
      </div>
      <div style={{ padding: "12px 2px 0", display: "flex", flexDirection: "column", gap: 4 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}>{community.name}</h3>
        {community.city && (
          <div style={{ fontSize: 13.5, color: "rgba(30,58,43,0.65)" }}>📍 {community.city}</div>
        )}
      </div>
    </Link>
  );
}

function EmptyState({ kind }: { kind: "etkinlik" | "topluluk" }) {
  return (
    <div style={{
      padding: "60px 30px",
      textAlign: "center",
      border: "1.5px dashed var(--border)",
      borderRadius: 20,
      background: "var(--paper-cream)",
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
      <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800 }}>
        Henüz {kind} yok
      </h3>
      <p style={{ margin: 0, fontSize: 14.5, color: "rgba(30,58,43,0.65)", maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>
        Bu kategoride ilk {kind}i sen başlat.
      </p>
    </div>
  );
}
