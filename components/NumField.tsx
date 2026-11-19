'use client';
import { useEffect, useState } from 'react';

/** Number input that commits on blur / Enter; reverts to the server value when the parent rejects. */
export default function NumField({ value, onCommit, label, step = 1, min, max, prefix, suffix, disabled, id }: {
  value: number; onCommit: (n: number) => void; label: string; step?: number; min?: number; max?: number;
  prefix?: string; suffix?: string; disabled?: boolean; id?: string;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const n = Number(text);
    if (text.trim() === '' || !Number.isFinite(n)) return setText(String(value));
    if (n !== value) onCommit(n); // out-of-range values go to the server, which rejects with a message
  };
  return (
    <label className="flex items-center gap-1.5 text-sm">
      <span className="sr-only">{label}</span>
      {prefix && <span className="text-ink-faint">{prefix}</span>}
      <input
        id={id} aria-label={label} type="number" inputMode="decimal" step={step} min={min} max={max} value={text} disabled={disabled}
        onChange={(e) => setText(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        className="field num w-24 py-1.5 text-right"
      />
      {suffix && <span className="text-ink-faint">{suffix}</span>}
    </label>
  );
}
