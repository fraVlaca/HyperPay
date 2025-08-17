import React from "react";
import Image from "next/image";
import clsx from "clsx";

type Props = {
  className?: string;
};

export default function SkaterBackground({ className }: Props) {
  return (
    <div
      aria-hidden
      className={clsx(
        "pointer-events-none fixed inset-x-0 bottom-0 z-0 h-24 sm:h-36 overflow-visible",
        className
      )}
    >
      <div className="relative h-full w-screen">
        <div className="absolute bottom-0 left-0 animate-skate opacity-20 saturate-100 will-change-transform">
          <Image
            src="/img/hyperpay_skateboard.png"
            alt=""
            width={340}
            height={340}
            priority
          />
        </div>
      </div>
    </div>
  );
}
