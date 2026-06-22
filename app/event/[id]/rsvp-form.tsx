'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function RSVPForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Aynı e-posta ile daha önce kayıt yapılmış mı?
    const { data: existing } = await supabase
      .from('rsvps')
      .select('id')
      .eq('event_id', eventId)
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      setError('Bu e-posta ile zaten kayıt yapılmış.');
      setLoading(false);
      return;
    }

    const { error: dbError } = await supabase.from('rsvps').insert({
      event_id: eventId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
    });

    if (dbError) {
      setError(dbError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    // Sayfayı yenile ki RSVP listesi güncellensin
    router.refresh();
  }

  if (success) {
    return (
      <div className="alert alert-success">
        <div className="quote">"Yerin ayrıldı — orada görüşürüz."</div>
        <div style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>
          Etkinlik öncesi e-postayla bir hatırlatma gönderilecek.
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--paper-light)', border: '0.5px solid rgba(31,42,36,0.18)', borderRadius: 8, padding: 24, margin: '24px 0' }}>
      <h3 className="h-serif" style={{ fontSize: 18, marginBottom: 16 }}>
        Yerini ayır
      </h3>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Adın</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Etkinlikte nasıl çağırılmak istersin"
            required
          />
        </div>

        <div className="field">
          <label>E-posta</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="hatırlatma için"
            required
          />
          <span className="hint">Sadece etkinlik hatırlatması için kullanılır.</span>
        </div>

        <button type="submit" className="btn" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Ayrılıyor...' : 'Yerimi ayır'}
        </button>
      </form>
    </div>
  );
}
