import clsx from "clsx";
import Image from "next/image";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function WidgetCard({ children, className }: Props) {
  return (
    <div className={clsx(
      "relative mx-auto w-full max-w-md rounded-2xl border border-black/5 bg-white/80 p-4 shadow-xl backdrop-blur",
      "ring-1 ring-black/5",
      className
    )}>
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl">
        <Image src="/img/background.png" alt="" fill className="object-cover opacity-25" priority />
      </div>
      {children}
    </div>
  );
}
