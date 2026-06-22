import { supabase, type Event, type RSVP } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import RSVPForm from './rsvp-form';
import ShareBox from './share-box';

export const dynamic = 'force-dynamic';

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;

  // Etkinliği getir
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !event) {
    notFound();
  }

  // RSVP'leri getir
  const { data: rsvps } = await supabase
    .from('rsvps')
    .select('*')
    .eq('event_id', id)
    .order('created_at', { ascending: true });

  const rsvpList = (rsvps as RSVP[]) || [];
  const date = new Date(event.date);
  const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const formattedDate = `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  const formattedDay = dayNames[date.getDay()];
  const formattedTime = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  const spotsLeft = event.capacity - rsvpList.length;
  const isFull = spotsLeft <= 0;

  return (
    <div className="narrow">
      {created && (
        <div className="alert alert-success">
          <div className="quote">"Etkinliğin yayında — paylaşmaya hazır."</div>
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>
            Aşağıdaki linki kopyalayıp üyelerine gönderebilirsin.
          </div>
        </div>
      )}

      {created && <ShareBox eventId={id} />}

      <div className="eyebrow">— Etkinlik No. {id.slice(0, 4).toUpperCase()}</div>
      <h1 className="h-serif">{event.title}</h1>
      {event.subtitle && (
        <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--muted)', fontStyle: 'italic', marginTop: -10, marginBottom: 20 }}>
          — {event.subtitle}
        </div>
      )}

      <div className="event-meta">
        <div>
          <div className="field-label">Ne zaman</div>
          <div className="field-value">
            {formattedDate}<br />
            {formattedDay}, {formattedTime}
          </div>
        </div>
        <div>
          <div className="field-label">Nerede</div>
          <div className="field-value">{event.location}</div>
        </div>
        <div>
          <div className="field-label">Kapasite</div>
          <div className="field-value">
            {rsvpList.length} / {event.capacity}
            {!isFull && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontFamily: 'var(--sans)' }}>
                {spotsLeft} yer kaldı
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ margin: '32px 0' }}>
        <h3 className="h-serif" style={{ fontSize: 18, marginBottom: 12 }}>Ne yapacağız?</h3>
        <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {event.description}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 0', borderTop: '0.5px solid rgba(31,42,36,0.1)', borderBottom: '0.5px solid rgba(31,42,36,0.1)', margin: '24px 0' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--ink)', color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 14 }}>
          {event.organizer_name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--seal)', textTransform: 'uppercase', marginBottom: 2 }}>
            Düzenleyen
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 15 }}>{event.organizer_name}</div>
        </div>
      </div>

      {/* RSVP formu */}
      {!isFull ? (
        <RSVPForm eventId={id} />
      ) : (
        <div className="alert" style={{ background: 'var(--oldpaper)', textAlign: 'center', padding: 24 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontStyle: 'italic', marginBottom: 8 }}>
            Tüm yerler doldu.
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            Bir sonraki etkinliği takip et.
          </div>
        </div>
      )}

      {/* Kim gidiyor */}
      <div className="rsvp-list">
        <h3 className="h-serif" style={{ fontSize: 18 }}>
          Kim gidiyor
          <span className="count">{rsvpList.length} kişi</span>
        </h3>
        {rsvpList.length === 0 ? (
          <div className="empty">İlk gelen sen ol.</div>
        ) : (
          rsvpList.map((rsvp) => (
            <div key={rsvp.id} className="person">
              <div className="avatar">{rsvp.name.charAt(0).toUpperCase()}</div>
              <span>{rsvp.name}</span>
            </div>
          ))
        )}
      </div>

      {!created && <ShareBox eventId={id} />}
    </div>
  );
}
