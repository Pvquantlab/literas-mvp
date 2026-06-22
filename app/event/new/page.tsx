'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    location: '',
    date: '',
    time: '19:30',
    capacity: 20,
    organizer_name: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Tarih ve saati birleştir
    const fullDate = new Date(`${form.date}T${form.time}:00`);

    const { data, error: dbError } = await supabase
      .from('events')
      .insert({
        title: form.title,
        subtitle: form.subtitle || null,
        description: form.description,
        location: form.location,
        date: fullDate.toISOString(),
        capacity: form.capacity,
        organizer_name: form.organizer_name,
      })
      .select()
      .single();

    if (dbError) {
      setError(dbError.message);
      setLoading(false);
      return;
    }

    // Başarılı, etkinlik sayfasına yönlendir
    router.push(`/event/${data.id}?created=true`);
  }

  return (
    <div className="narrow">
      <div className="eyebrow">— Yeni etkinlik</div>
      <h1 className="h-serif">Etkinliğini hazırla.</h1>
      <p className="lede">
        Birkaç basit soru. İstediğin zaman değiştirebilirsin.
      </p>

      {error && (
        <div className="alert alert-error">
          Bir hata oldu: {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>
            <span className="num">i.</span>
            Ne yapacaksınız?
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Örnek: Tutunamayanlar — Oğuz Atay"
            required
          />
        </div>

        <div className="field">
          <label>
            <span className="num">ii.</span>
            Alt başlık <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 8 }}>— opsiyonel</span>
          </label>
          <input
            type="text"
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            placeholder="Örnek: Bir akşam, bir kitap"
          />
        </div>

        <div className="field">
          <label>
            <span className="num">iii.</span>
            Anlat biraz.
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Ne yapacaksınız? Kimler gelmeli? Ne getirmeli?"
            required
          />
        </div>

        <div className="field">
          <label>
            <span className="num">iv.</span>
            Ne zaman?
          </label>
          <div className="row-2">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
            <input
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="field">
          <label>
            <span className="num">v.</span>
            Nerede?
          </label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Örnek: Moda Kahvesi, Kadıköy"
            required
          />
        </div>

        <div className="field">
          <label>
            <span className="num">vi.</span>
            Kaç kişi sığar?
          </label>
          <input
            type="number"
            min={2}
            max={500}
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 20 })}
            required
          />
        </div>

        <div className="field">
          <label>
            <span className="num">vii.</span>
            Senin adın?
          </label>
          <input
            type="text"
            value={form.organizer_name}
            onChange={(e) => setForm({ ...form, organizer_name: e.target.value })}
            placeholder="Örnek: Defne Aksoy"
            required
          />
          <span className="hint">Düzenleyen olarak görünecek.</span>
        </div>

        <div style={{ borderTop: '0.5px solid rgba(31,42,36,0.12)', paddingTop: 20, marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase' }}>
            Hazır olduğunda
          </span>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Oluşturuluyor...' : 'Etkinliği yayımla →'}
          </button>
        </div>
      </form>
    </div>
  );
}
