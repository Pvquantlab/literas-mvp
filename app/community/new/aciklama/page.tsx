'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useWizard } from '../wizard-context'
import { saveDraft } from '../actions'

const MIN_LEN = 50
const MAX_LEN = 2000

const ORNEKLER = [
  {
    baslik: 'Kadıköy Kitap Kulübü',
    metin: 'Her ay bir kitap seçiyor, ayın son cumartesi Moda sahilinde bir kafede buluşup konuşuyoruz. Yeni gelenler her zaman hoş karşılanır. Kimin ne okuduğu değil, birlikte ne düşünebildiğimiz önemli. Türk ve dünya edebiyatından karışık bir seçki takip ediyoruz.',
  },
  {
    baslik: 'İstanbul Doğa Yürüyüşleri',
    metin: 'Şehrin gürültüsünden bir günlüğüne uzaklaşmak isteyenler için. Belgrad Ormanı, Polonezköy, Ağva rotalarında pazar günleri buluşuyoruz. Her seviyeye uygun rotalar hazırlıyoruz — yeni başlayanlar da bize katılabilir. Ekip ruhuna ve doğaya saygıya değer veriyoruz.',
  },
  {
    baslik: 'Teknoloji Sohbetleri İstanbul',
    metin: 'Yazılım geliştirici, tasarımcı, ürün yöneticisi olarak çalışan ya da bu alana ilgi duyanların ayda bir bir araya geldiği samimi bir topluluk. Konuk konuşmacılar, yuvarlak masa sohbetleri ve networking. Amaç: sektörde yeni fikirleri paylaşmak ve birbirimizden öğrenmek.',
  },
]

export default function AciklamaStep() {
  const router = useRouter()
  const { draft, update, isSaving, setSaving } = useWizard()
  const [description, setDescription] = useState(draft.description ?? '')
  const [currentExample, setCurrentExample] = useState(0)

  const trimmed = description.trim()
  const canProceed = trimmed.length >= MIN_LEN && trimmed.length <= MAX_LEN

  async function handleNext() {
    if (!canProceed || isSaving) return
    setSaving(true)
    try {
      update({ description: trimmed })
      await saveDraft({ description: trimmed }, 'gonder')
      router.push('/community/new/gonder')
    } catch (e) {
      console.error(e)
      alert('Kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="aciklama-grid">
      {/* SOL: Form */}
      <div className="auth-card" style={{ padding: '32px' }}>
        <h2 className="serif" style={{ fontSize: '24px', margin: '0 0 8px', color: 'var(--ink)' }}>
          Grubunuzu tanımlayın
        </h2>
        <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: '0 0 20px', lineHeight: 1.6 }}>
          Grubunuzu tanıtırken insanlar bunu görecek, ancak daha sonra da güncelleyebilirsiniz. İnsan bağlantısını önemsiyoruz, bu yüzden grubunuzun{' '}
          <Link
            href="/topluluk-kurallari"
            target="_blank"
            style={{ color: 'var(--ink)', textDecoration: 'underline' }}
          >
            topluluk kuralları
          </Link>{' '}
          ile uyumlu olduğundan emin olmak için biri tarafından incelenecek.
        </p>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, MAX_LEN))}
          rows={10}
          placeholder="Kendi tanımınızı yazın."
          style={{ width: '100%', fontSize: '15px', lineHeight: 1.55, resize: 'vertical' }}
          autoFocus
        />
        <p style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '11.5px',
          color: trimmed.length > 0 && trimmed.length < MIN_LEN
            ? 'var(--coral-deep, #b04330)'
            : 'var(--muted)',
          marginTop: '6px',
          textAlign: 'right',
        }}>
          {trimmed.length} / {MAX_LEN}
          {trimmed.length > 0 && trimmed.length < MIN_LEN && ` (en az ${MIN_LEN})`}
        </p>

        {/* Alt navigasyon */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '24px',
          paddingTop: '20px',
          borderTop: '1px solid rgba(30, 58, 43, 0.1)',
        }}>
          <Link
            href="/community/new/ad"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '13px',
              color: 'var(--muted)',
              textDecoration: 'none',
            }}
          >
            ← Geri
          </Link>
          <button
            className="btn-primary"
            onClick={handleNext}
            disabled={!canProceed || isSaving}
          >
            {isSaving ? 'Kaydediliyor…' : 'İleri →'}
          </button>
        </div>
      </div>

      {/* SAĞ: İki kart */}
      <aside className="aciklama-side">
        {/* Bilgi kartı */}
        <div
          style={{
            padding: '20px',
            borderRadius: '14px',
            background: 'var(--lime, #D6FF3F)',
            color: 'var(--ink)',
          }}
        >
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11.5px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '8px',
            opacity: 0.7,
          }}>
            💡 not
          </div>
          <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '14.5px' }}>
            Göndermeden önce gözden geçirin
          </div>
          <p style={{ fontSize: '13.5px', margin: 0, lineHeight: 1.5 }}>
            Grubunuz onaylandığında, çevredeki insanlara duyurulacak — harika bir ilk izlenim bırakma şansınız! Daha fazla üyenin katılmak için heyecanlanması için en iyi şekilde hazırlanın.
          </p>
        </div>

        {/* Örnekler karuseli */}
        <div
          style={{
            padding: '20px',
            borderRadius: '14px',
            background: 'var(--paper-soft, rgba(30, 58, 43, 0.04))',
            border: '1.5px solid rgba(30, 58, 43, 0.1)',
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
          }}>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '11.5px',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              örnek {currentExample + 1} / {ORNEKLER.length}
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setCurrentExample((i) => (i === 0 ? ORNEKLER.length - 1 : i - 1))}
                aria-label="Önceki örnek"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '999px',
                  background: 'transparent',
                  border: '1.5px solid rgba(30, 58, 43, 0.2)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: 'var(--ink)',
                }}
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => setCurrentExample((i) => (i === ORNEKLER.length - 1 ? 0 : i + 1))}
                aria-label="Sonraki örnek"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '999px',
                  background: 'transparent',
                  border: '1.5px solid rgba(30, 58, 43, 0.2)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: 'var(--ink)',
                }}
              >
                →
              </button>
            </div>
          </div>
          <div
            className="serif"
            style={{ fontSize: '15px', color: 'var(--ink)', marginBottom: '6px', fontWeight: 500 }}
          >
            {ORNEKLER[currentExample].baslik}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--ink)', margin: 0, lineHeight: 1.55, opacity: 0.85 }}>
            {ORNEKLER[currentExample].metin}
          </p>
        </div>
      </aside>

      <style>{`
        .aciklama-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 24px;
          align-items: start;
        }
        .aciklama-side {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        @media (max-width: 820px) {
          .aciklama-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
