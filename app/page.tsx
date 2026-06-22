import Link from 'next/link';
import { supabase, type Event } from '@/lib/supabase';

// Bu sayfa her istekte güncel veriyi çeker
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Veritabanından tüm etkinlikleri çek (en yeniler önce)
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true });

  if (error) {
    return (
      <div>
        <div className="alert alert-error">
          Veritabanına bağlanırken bir hata oldu. Supabase ayarlarını kontrol et.
        </div>
        <pre style={{ fontSize: 12, color: '#4A5C53' }}>{error.message}</pre>
      </div>
    );
  }

  const upcomingEvents = (events as Event[]).filter(
    (e) => new Date(e.date) >= new Date()
  );

  return (
    <div>
      <div className="eyebrow">— Yaklaşan</div>
      <h1 className="h-serif">Etkinlikler</h1>
      <p className="lede">
        İnsanlar topluluklarında bir araya geliyor. Bir etkinliğe katılmak ya da
        kendininkini açmak için aşağıdan başla.
      </p>

      {upcomingEvents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontStyle: 'italic', color: 'var(--muted)', marginBottom: 16 }}>
            Henüz hiçbir etkinlik yok.
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
            İlk etkinliği sen açabilirsin.
          </p>
          <Link href="/event/new" className="btn">
            İlk etkinliği aç
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {upcomingEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  const date = new Date(event.date);
  const day = date.getDate();
  const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const month = monthNames[date.getMonth()];
  const dayName = dayNames[date.getDay()];
  const time = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  return (
    <Link
      href={`/event/${event.id}`}
      style={{
        background: 'var(--paper-light)',
        border: '0.5px solid rgba(31,42,36,0.15)',
        padding: '16px 20px',
        borderRadius: 8,
        display: 'grid',
        gridTemplateColumns: '60px 1fr auto',
        gap: 20,
        alignItems: 'center',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
    >
      <div style={{ textAlign: 'center', borderRight: '0.5px solid rgba(31,42,36,0.15)', paddingRight: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--seal)', textTransform: 'uppercase' }}>
          {dayName}
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 24, lineHeight: 1, margin: '4px 0 2px' }}>
          {day}
        </div>
        <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
          {month}
        </div>
      </div>
      <div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginBottom: 4 }}>
          {event.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          {time} · {event.location} · {event.organizer_name}
        </div>
      </div>
      <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>
        Detay →
      </div>
    </Link>
  );
}
