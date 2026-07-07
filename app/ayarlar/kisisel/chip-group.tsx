"use client";

import { useState } from "react";

type Option = { value: string; label: string };

export default function ChipGroup({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: Option[];
  defaultValue: string[];
}) {
  const [selected, setSelected] = useState<string[]>(defaultValue);

  const toggle = (value: string) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "9px 16px",
              borderRadius: 999,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              whiteSpace: "nowrap",
              color: "var(--ink)",
              background: active ? "var(--lime)" : "var(--paper)",
              border: `1.5px solid ${active ? "var(--ink)" : "var(--border)"}`,
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            {opt.label}
          </button>
        );
      })}
      <input type="hidden" name={name} value={selected.join(",")} />
    </div>
  );
}
