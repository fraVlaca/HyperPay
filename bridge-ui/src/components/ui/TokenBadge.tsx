import Image from "next/image";

export default function TokenBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 shadow-sm">
      <Image src="/img/pyusd_logo.png" alt="PYUSD" width={20} height={20} />
      <div className="leading-none">
        <div className="text-xs text-gray-500">Token</div>
        <div className="text-sm font-medium">PYUSD</div>
      </div>
    </div>
  );
}
