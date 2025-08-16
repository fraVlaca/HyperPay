import clsx from "clsx";

type Props = {
  text: string;
  tone?: "neutral" | "success" | "warning";
};

export default function Badge({ text, tone = "neutral" }: Props) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
  const color =
    tone === "success"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "warning"
      ? "bg-amber-100 text-amber-800"
      : "bg-gray-100 text-gray-800";
  return <span className={clsx(base, color)}>{text}</span>;
}
