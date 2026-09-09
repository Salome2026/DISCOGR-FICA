"use client";

import { usePathname, useRouter } from "next/navigation";

// Flechita fija de "volver atrás", en la esquina superior izquierda de
// cualquier pantalla — mismo criterio que VpoWatermark.tsx: se monta una
// sola vez desde el layout raíz en vez de que cada página/shell cargue la
// suya, así queda en TODOS lados sin tener que tocar cada módulo. Usa el
// historial real del navegador (router.back()) en vez de un backHref fijo
// por página — así siempre vuelve a donde el usuario realmente vino, sin
// tener que mantener a mano cuál es el "padre" correcto de cada una de las
// decenas de pantallas del proyecto.
const EXCLUDED_PATHS = new Set(["/"]);

export default function BackButton() {
  const pathname = usePathname();
  const router = useRouter();
  if (EXCLUDED_PATHS.has(pathname)) return null;

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Volver atrás"
      title="Volver atrás"
      style={{
        position: "fixed",
        top: 14,
        left: 14,
        zIndex: 40,
        width: 36,
        height: 36,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        color: "var(--text-1)",
        cursor: "pointer",
        backdropFilter: "blur(16px) saturate(1.7)",
        WebkitBackdropFilter: "blur(16px) saturate(1.7)",
        boxShadow: "var(--shadow-glass)",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
