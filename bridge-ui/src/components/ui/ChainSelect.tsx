import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

type Option = { key: string; name: string; disabled?: boolean; iconUrl?: string };
type Props = {
  label: string;
  value: string;
  options: Option[];
  onChange: (val: string) => void;
};

export default function ChainSelect({ label, value, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const current = options.find((o) => o.key === value) || options[0];

  return (
    <div className="w-full relative" ref={ref}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <button
        type="button"
        className={clsx(
          "flex w-full items-center justify-between rounded-xl border border-black/10 bg-white px-3 py-2 shadow-sm transition",
          "hover:border-black/20"
        )}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          {current?.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.iconUrl} alt="" className="h-5 w-5 rounded-full object-contain" />
          ) : (
            <div className="h-5 w-5 rounded-full bg-gradient-to-br from-brand-400 to-brand-600" />
          )}
          <span className="text-sm font-medium">{current?.name || value}</span>
        </div>
        <svg width="16" height="16" viewBox="0 0 20 20" className={clsx("transition", open ? "rotate-180" : "")}>
          <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 right-0 mt-1 z-20 overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg">
          {options.map((o) => (
            <button
              key={o.key}
              disabled={o.disabled}
              className={clsx(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition",
                o.disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-black/5"
              )}
              onClick={() => {
                if (o.disabled) return;
                onChange(o.key);
                setOpen(false);
              }}
            >
              {o.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.iconUrl} alt="" className="h-4 w-4 rounded-full object-contain" />
              ) : (
                <div className="h-4 w-4 rounded-full bg-gradient-to-br from-brand-400 to-brand-600" />
              )}
              <span>{o.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
