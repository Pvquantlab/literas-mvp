"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { dosyayiDogrula, guvenliDosyaAdi, kovaLimitMb } from "@/lib/upload";

const BUCKET = "avatars";

export default function AvatarEditor({
  initialUrl,
  initial,
}: {
  initialUrl: string | null;
  initial: string;
}) {
  const supabase = createClient();
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Aynı dosya hatadan sonra tekrar seçilebilsin diye input'u her seferinde
    // sıfırlıyoruz; aksi halde onChange bir daha tetiklenmiyor.
    e.target.value = "";
    if (!file) return;

    // Kurallar lib/upload.ts'te: eskiden burada yalnızca boyuta bakılıyordu ve
    // limit 5 MB yazılıydı — oysa avatars kovasının sunucu limiti 2 MB.
    // 3 MB'lık bir görsel istemci kontrolünü geçip sunucudan ham İngilizce
    // hata alıyordu. Uzantı da kullanıcının dosya adından türetiliyordu.
    const dogrulama = dosyayiDogrula(file, BUCKET);
    if (!dogrulama.ok) {
      setError(dogrulama.mesaj);
      return;
    }

    setUploading(true);
    setError(null);

    const fileName = guvenliDosyaAdi(file.type);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type, // tahmine bırakma
      });

    if (uploadError) {
      console.error("[avatar] yükleme hatası:", uploadError);
      setError("Yükleme başarısız. Lütfen tekrar dene.");
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(fileName);

    setUrl(publicUrl);
    setUploading(false);
  }

  function handleRemove() {
    setUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function openPicker() {
    if (!uploading) inputRef.current?.click();
  }

  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ position: "relative", width: 88, height: 88, flex: "0 0 auto" }}>
          <button
            type="button"
            onClick={openPicker}
            disabled={uploading}
            aria-label="Fotoğrafı değiştir"
            style={{
              width: "100%", height: "100%", borderRadius: "50%",
              background: url ? "transparent" : "var(--paper-soft)",
              border: "1.5px solid var(--border)",
              display: "grid", placeItems: "center",
              fontSize: 32, fontWeight: 800, color: "var(--ink)",
              cursor: uploading ? "wait" : "pointer",
              overflow: "hidden",
              padding: 0,
              fontFamily: "inherit",
              position: "relative",
            }}
          >
            {url ? (
              <img
                src={url}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              initial
            )}
            {uploading && (
              <span style={{
                position: "absolute", inset: 0,
                background: "rgba(30,58,43,0.55)",
                color: "white",
                display: "grid", placeItems: "center",
                fontSize: 11,
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                yükleniyor…
              </span>
            )}
          </button>
          {!uploading && (
            <span
              aria-hidden="true"
              style={{
                position: "absolute", right: -2, bottom: -2,
                width: 26, height: 26, borderRadius: "50%",
                background: "var(--coral)",
                border: "2px solid var(--paper)",
                display: "grid", placeItems: "center",
                pointerEvents: "none",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
          <button
            type="button"
            onClick={openPicker}
            disabled={uploading}
            style={{
              padding: "10px 18px",
              border: "1.5px solid var(--ink)",
              borderRadius: 999,
              background: "var(--paper)",
              fontSize: 14, fontWeight: 600,
              color: "var(--ink)",
              cursor: uploading ? "wait" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {url ? "Fotoğrafı değiştir" : "Fotoğraf yükle"}
          </button>
          {url && (
            <button
              type="button"
              onClick={handleRemove}
              style={{
                background: "none", border: "none", padding: 0,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12.5,
                color: "var(--coral-deep)",
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              fotoğrafı kaldır
            </button>
          )}
          <p style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            color: "rgba(30,58,43,0.6)",
            margin: 0,
          }}>
            jpg, png veya webp · en fazla {kovaLimitMb(BUCKET)} mb
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        disabled={uploading}
        style={{ display: "none" }}
      />

      {/* Server action için hidden input */}
      <input type="hidden" name="avatar_url" value={url ?? ""} />

      {error && (
        <p style={{
          marginTop: 10,
          fontSize: 13,
          color: "var(--coral-deep)",
          fontWeight: 600,
        }}>
          {error}
        </p>
      )}
    </div>
  );
}
