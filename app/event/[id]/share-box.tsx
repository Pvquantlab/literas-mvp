'use client';

import { useState } from 'react';

export default function ShareBox({ eventId }: { eventId: string }) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState('');

  // useEffect ile window'a erişim
  if (typeof window !== 'undefined' && !url) {
    setUrl(`${window.location.origin}/event/${eventId}`);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Fallback
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="share-box">
      <div className="label">Etkinlik linki — üyelerine gönder</div>
      <div className="url">
        <input type="text" value={url} readOnly />
        <button className="copy-btn" onClick={copy}>
          {copied ? '✓ Kopyalandı' : 'Kopyala'}
        </button>
      </div>
    </div>
  );
}
