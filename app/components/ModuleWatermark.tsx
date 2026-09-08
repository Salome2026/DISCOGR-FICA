"use client";

// Marca de agua de fondo genérica, para módulos sin un *Shell propio
// (A&R, Playlists, Distribución). Mismo mecanismo exacto que .mgmt-
// watermark/.bkg-watermark/etc: z-index 0 (NUNCA negativo — el fondo
// gradient propio de .bg-atmosphere pinta en el paso de "contenido normal
// no posicionado", que va DESPUÉS de cualquier z-index negativo, así que
// un z-index negativo queda tapado por completo). El div de contenido real
// de cada página necesita su propio position:relative + zIndex:1 (mismo
// criterio que .mgmt-inner) para pintarse por encima de esto.
export default function ModuleWatermark({ text }: { text: string }) {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 0,
        maxWidth: "50vw",
        overflow: "hidden",
        fontSize: "clamp(36px, 4.5vw, 84px)",
        fontWeight: 800,
        letterSpacing: "-.02em",
        lineHeight: 1,
        whiteSpace: "nowrap",
        color: "var(--text-1)",
        opacity: 0.05,
        transform: "translate(-2%, -10%)",
        pointerEvents: "none",
        userSelect: "none",
        fontFamily: "var(--font-display)",
      }}
    >
      {text}
    </div>
  );
}
