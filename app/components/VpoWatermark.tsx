"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

// Landing page already has the VPO mark as its main animated visual — a
// second static watermark behind it would just double up. Every other
// screen in the app gets this once, here, instead of each page carrying
// its own copy (see the now-removed per-page version that used to live
// only on /dashboard).
const EXCLUDED_PATHS = new Set(["/"]);

export default function VpoWatermark() {
  const pathname = usePathname();
  if (EXCLUDED_PATHS.has(pathname)) return null;

  return (
    <Image
      src="/vpo-logo.png"
      alt=""
      width={2539}
      height={1298}
      className="vpo-watermark"
      aria-hidden
      priority={false}
    />
  );
}
