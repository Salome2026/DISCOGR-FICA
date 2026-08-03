"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

// Apple-product-page-style intro: the mark starts large and centered, and
// pins in place (sticky) while the user scrolls through this section's
// height — shrinking, drifting up and fading out as it hands off to the
// actual landing content (cards / login) that follows in normal flow right
// after. Scroll position drives every value directly; nothing here plays on
// its own. Respects prefers-reduced-motion by skipping straight to a static,
// already-docked mark with no scroll-driven section at all.
export default function VPOScrollHero() {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  // The section is 200dvh tall, so the sticky child only stays pinned on
  // screen for the first half of scrollYProgress (0 -> 0.5) before it
  // unpins and scrolls away with the page. Every value below finishes its
  // move by 0.45 so the whole animation plays out while still pinned —
  // otherwise it'd be shrinking/fading off-screen, unseen.
  const scale = useTransform(scrollYProgress, [0, 0.45], [1, 0.55]);
  const y = useTransform(scrollYProgress, [0, 0.45], [0, -24]);
  const markOpacity = useTransform(scrollYProgress, [0.28, 0.45], [1, 0]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.18], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.22], [0, -14]);
  const hint = useTransform(scrollYProgress, [0, 0.08], [1, 0]);

  if (reduceMotion) {
    return (
      <div className="vpo-hero-static">
        <Image src="/vpo-logo.png" alt="VPO Corp" width={2539} height={1298} className="vpo-hero-logo" preload />
        <p>Centro de control · acceso interno</p>
      </div>
    );
  }

  return (
    <div ref={ref} className="vpo-hero">
      <div className="vpo-hero-sticky">
        <motion.div style={{ scale, y, opacity: markOpacity }}>
          <Image
            src="/vpo-logo.png"
            alt="VPO Corp"
            width={2539}
            height={1298}
            className="vpo-hero-logo"
            preload
          />
        </motion.div>
        <motion.div className="vpo-hero-text" style={{ opacity: textOpacity, y: textY }}>
          <p>Centro de control · acceso interno</p>
        </motion.div>
        <motion.div className="vpo-hero-scrollhint" style={{ opacity: hint }}>
          Desplazate para ingresar ↓
        </motion.div>
      </div>
    </div>
  );
}
