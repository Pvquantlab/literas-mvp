"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase";

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
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Dosya çok büyük. 5 MB'dan küçük olmalı.");
      return;
    }

    setUploading(true);
    setError(null);

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      setError("Yükleme başarısız: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
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
