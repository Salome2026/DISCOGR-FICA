"use client";

export default function EstadisticasIngresos() {
  return (
    <div className="card">
      <div className="card-label">Estadísticas de ingresos</div>
      <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 16 }}>
        Este módulo se va a alimentar con los reportes de regalías. Todavía no hay ningún reporte
        cargado, así que no se muestra ningún número — nada acá está simulado ni estimado.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        {["Desde", "Hasta", "Artista", "Sello", "Distribuidora"].map((label) => (
          <div key={label} style={{ flex: "1 1 140px", minWidth: 140 }}>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{label}</div>
            <select
              disabled
              style={{
                width: "100%",
                background: "var(--bg-2)",
                border: "1px solid var(--line-soft)",
                borderRadius: 8,
                padding: "8px 10px",
                color: "var(--text-3)",
                fontSize: 12.5,
              }}
            >
              <option>Sin datos todavía</option>
            </select>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {[
          "Ingresos por sello",
          "Ingresos por artista",
          "Ingresos por fonograma",
          "Evolución mensual",
        ].map((label) => (
          <div
            key={label}
            style={{
              background: "var(--bg-2)",
              border: "1px dashed var(--line-soft)",
              borderRadius: 12,
              padding: "1.25rem",
              minHeight: 100,
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 12, color: "var(--text-3)" }}>
              Sin datos cargados. Se completa cuando importemos los reportes de regalías.
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
