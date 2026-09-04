"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion, useMotionValueEvent } from "framer-motion";

// Contorno real de "VPO" (V, palo+pancita de la P, vuelta completa de la O
// y salida), extraído vectorizando el canal alfa de /vpo-logo.png y
// reconstruido a mano como centerline — no la silueta completa del potrace
// (que traza los dos bordes de cada trazo), sino una única línea que sigue
// el medio de cada letra, en las coordenadas nativas del PNG (2539x1298).
const VPO_TRACE_PATH =
  "M 123 55 L 513 950 L 808 55 C 848 45, 892 45, 932 55 L 932 965 L 932 470 " +
  "C 1000 300, 1120 185, 1300 185 C 1520 185, 1660 300, 1660 420 C 1660 500, 1580 545, 1420 545 " +
  "C 1540 585, 1475 540, 1615 510 " +
  "C 1615 330.2, 1730.8 170.9, 1901.8 115.3 C 2072.7 59.8, 2260.1 120.6, 2365.7 266.1 " +
  "C 2471.4 411.5, 2471.4 608.5, 2365.7 753.9 C 2260.1 899.4, 2072.7 960.2, 1901.8 904.7 " +
  "C 1730.8 849.1, 1615 689.8, 1615 510 " +
  "C 1615 650, 2100 600, 2600 520";

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

  // Replays the light-sweep every time the user scrolls back up to the
  // logo, not just once on first mount. React remounts .vpo-flash/
  // .vpo-logo-shine (via the changing `key`) whenever scroll crosses back
  // into the "near top" zone from further down — that restarts their CSS
  // animations from 0%, since a fresh element always starts a fresh run.
  const [flashKey, setFlashKey] = useState(0);
  const wasNearTop = useRef(true);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const nearTop = v < 0.1;
    if (nearTop && !wasNearTop.current) setFlashKey((k) => k + 1);
    wasNearTop.current = nearTop;
  });

  // Same replay, triggered by coming back to the tab (switching away and
  // back) instead of scrolling — same established visibilitychange pattern
  // already used elsewhere in this app for "refresh when the user returns".
  // Only replays if the logo is actually the thing on screen right now
  // (wasNearTop), so switching tabs while scrolled down into the login
  // form doesn't randomly flash a mark that isn't even visible.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible" && wasNearTop.current) {
        setFlashKey((k) => k + 1);
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

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
            <div key={flashKey} aria-hidden style={{ display: "contents" }}>
              <div className="vpo-flash">
                <div className="vpo-flash-beam" />
                <div className="vpo-flash-beam-exit" />
              </div>
              <svg className="vpo-trace-svg" viewBox="0 0 2539 1298" preserveAspectRatio="xMidYMid meet">
                <path className="vpo-trace-comet" pathLength={1000} d={VPO_TRACE_PATH} />
                <circle className="vpo-trace-dot" r="20">
                  <animateMotion path={VPO_TRACE_PATH} dur="1s" begin="0.25s" fill="freeze" rotate="auto" />
                </circle>
              </svg>
              <div className="vpo-logo-shine" />
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
