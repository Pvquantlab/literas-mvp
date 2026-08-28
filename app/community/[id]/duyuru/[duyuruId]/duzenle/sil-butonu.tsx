'use client'

import { useState } from 'react'

export default function SilButonu() {
  const [onayBekliyor, setOnayBekliyor] = useState(false)

  return (
    <>
      {!onayBekliyor ? (
        <button
          type="button"
          onClick={() => setOnayBekliyor(true)}
          className="btn-secondary"
          style={{ fontSize: 13.5, padding: '8px 18px' }}
        >
          Duyuruyu sil
        </button>
      ) : (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--muted)', fontSize: 13.5 }}>emin misin? bu geri alınamaz</span>
          <button
            type="submit"
            style={{
              background: 'var(--coral-deep)',
              color: 'var(--paper-soft)',
              border: 'none',
              padding: '5px 12px',
              borderRadius: '999px',
              fontFamily: 'inherit',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            evet, sil
          </button>
          <button
            type="button"
            onClick={() => setOnayBekliyor(false)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontFamily: 'inherit',
              fontSize: 'inherit',
              color: 'var(--muted)',
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            vazgeç
          </button>
        </div>
      )}
    </>
  )
}
