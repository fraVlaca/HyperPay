import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/img/hyperpay_logo.png"
            alt="HyperPay"
            width={36}
            height={36}
            priority
          />
          <span className="text-lg font-semibold tracking-tight">HyperPay</span>
        </Link>
        <div className="text-xs text-gray-500">Bridge PyUSD fast</div>
      </div>
    </header>
  );
}
