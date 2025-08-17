import { useState, ReactNode } from "react";
import clsx from "clsx";

type Props = {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
};

export default function Collapsible({ title, subtitle, defaultOpen = false, children, className }: Props) {
  const [open, setOpen] = useState<boolean>(defaultOpen);
  return (
    <div className={clsx("rounded-xl border border-black/10", className)}>
      <button
        type="button"
        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 rounded-t-xl"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="text-left">
          <div className="text-sm font-medium">{title}</div>
          {subtitle ? <div className="text-xs text-gray-600">{subtitle}</div> : null}
        </div>
        <span className="ml-3 text-gray-500">{open ? "▾" : "▸"}</span>
      </button>
      {open ? <div className="px-3 py-3 border-t">{children}</div> : null}
    </div>
  );
}
