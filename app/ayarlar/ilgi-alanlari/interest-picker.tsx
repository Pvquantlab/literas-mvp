"use client";

import { useState } from "react";

const PILL_COLORS = [
  { bg: "#D7E9FB", ink: "#2A5B8F" },
  { bg: "#FFCFC5", ink: "#B04330" },
  { bg: "#E9F6AC", ink: "#4B6B00" },
  { bg: "#FFE9A8", ink: "#8A5A00" },
  { bg: "#F0D7FB", ink: "#6B2A8F" },
];

export default function InterestPicker({
  defaultValue,
  suggested,
}: {
  defaultValue: string[];
  suggested: string[];
}) {
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const [query, setQuery] = useState("");

  const add = (interest: string) => {
    const clean = interest.trim();
    if (!clean || selected.includes(clean)) return;
    setSelected([...selected, clean]);
    setQuery("");
  };

  const remove = (interest: string) => {
    setSelected(selected.filter((i) => i !== interest));
  };

  const availableSuggestions = suggested.filter(
    (s) => !selected.includes(s) && s.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      {/* Seçilenler */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
          İlgi alanlarınız
        </label>
        {selected.length === 0 ? (
          <p style={{ fontSize: 13.5, color: "rgba(30,58,43,0.55)", fontStyle: "italic" }}>
            Aşağıdan seçerek başlayın.
          </p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {selected.map((interest, i) => {
              const color = PILL_COLORS[i % PILL_COLORS.length];
              return (
                <span key={interest} style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderRadius: 999,
                  background: color.bg,
                  color: color.ink,
                  fontSize: 13.5,
                  fontWeight: 600,
                }}>
                  {interest}
                  <button
                    type="button"
                    onClick={() => remove(interest)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: color.ink, fontSize: 14, padding: 0, lineHeight: 1,
                      fontWeight: 700,
                    }}
                    aria-label={`${interest} kaldır`}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Arama */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(query);
            }
          }}
          placeholder="İlgi alanı ara veya kendin ekle..."
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px 14px",
            border: "1.5px solid var(--border)",
            borderRadius: 12,
            background: "var(--paper-cream)",
            fontSize: 14.5,
            color: "var(--ink)",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
      </div>

      {/* Öneriler */}
      {availableSuggestions.length > 0 && (
        <div>
          <div style={{ font: "500 11px 'IBM Plex Mono', monospace", letterSpacing: "0.08em", color: "rgba(30,58,43,0.55)", textTransform: "lowercase", marginBottom: 10 }}>
            öneriler
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {availableSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 999,
                  border: "1.5px dashed var(--border)",
                  background: "transparent",
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "var(--ink)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <input type="hidden" name="interests" value={selected.join("|")} />
    </>
  );
}
