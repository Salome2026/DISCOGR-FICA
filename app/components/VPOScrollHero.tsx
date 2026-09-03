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
  // "end end" (target bottom meets viewport bottom) lands exactly on the
  // moment the sticky child unpins, whatever height the section is given in
  // CSS — so scrollYProgress 0->1 always spans exactly the pin's full
  // scrollable duration, and the stops below stay correct no matter how
  // short the section is made.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  // Every value below finishes its move by 0.9 (90% through the pin) so the
  // whole animation plays out while still pinned, with a brief settled pause
  // before the handoff — otherwise it'd be shrinking/fading off-screen, unseen.
  const scale = useTransform(scrollYProgress, [0, 0.9], [1, 0.55]);
  const y = useTransform(scrollYProgress, [0, 0.9], [0, -24]);
  const markOpacity = useTransform(scrollYProgress, [0.56, 0.9], [1, 0]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.36], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.44], [0, -14]);
  const hint = useTransform(scrollYProgress, [0, 0.16], [1, 0]);

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
          <div className="vpo-logo-stage">
            <Image
              src="/vpo-logo.png"
              alt="VPO Corp"
              width={2539}
              height={1298}
              className="vpo-hero-logo"
              preload
            />
            <div className="vpo-logo-shine" aria-hidden />
            <div className="vpo-flash" aria-hidden>
              <div className="vpo-flash-beam" />
            </div>
          </div>
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
