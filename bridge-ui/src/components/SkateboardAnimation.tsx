import Image from "next/image";
import { useSkateboard } from "@lib/skateboard";

export default function SkateboardAnimation() {
  const { visible } = useSkateboard();

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-6 z-50 flex h-16 items-end transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden="true"
    >
      <div className="relative mx-auto h-12 w-28 animate-hp-skate">
        <Image src="/img/hyperpay_logo.png" alt="" fill sizes="112px" className="object-contain" priority />
      </div>
      <style jsx global>{`
        @keyframes hp-skate {
          0% {
            transform: translateX(-40vw) translateY(0px) rotate(-2deg);
          }
          25% {
            transform: translateX(-10vw) translateY(-2px) rotate(2deg);
          }
          50% {
            transform: translateX(10vw) translateY(0px) rotate(-1deg);
          }
          75% {
            transform: translateX(30vw) translateY(-2px) rotate(1deg);
          }
          100% {
            transform: translateX(50vw) translateY(0px) rotate(0deg);
          }
        }
        .animate-hp-skate {
          animation: hp-skate 1.8s ease-in-out infinite;
          filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.25));
        }
      `}</style>
    </div>
  );
}
