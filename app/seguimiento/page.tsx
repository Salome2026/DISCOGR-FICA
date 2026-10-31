"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { upload } from "@vercel/blob/client";
import RequireRole from "@/app/components/RequireRole";

// Seguimiento de proyectos: una sola página para revisar 2-3 veces por
// semana en qué está cada unidad (artistas, streamings, fiestas, sellos,
// subsellos, productores, premiaciones, distribución). Lo automático sale
// de la agenda de Booking, el catálogo/PM y Chartmetric; lo cualitativo
// (estado, foco, próximo paso) se carga en cada revisión.

type Tipo = "artista" | "streaming" | "fiesta" | "sello" | "subsello" | "productor" | "premiacion" | "distribucion";
type Estado = "en_marcha" | "atencion" | "frenado" | "sin_revisar";

type ShowLite = { fecha: string; venue: string | null; ciudad: string | null; estado: string };
type ReleaseLite = { titulo: string; fecha: string; estado?: string };
type Metrics = {
  showsNext7: number;
  showsNext30: number;
  showsThisMonth: number;
  showsLast30: number;
  showsPerMonth: number;
  nextShow: ShowLite | null;
  upcomingShows: ShowLite[];
  releasesLast30: number;
  releasesLast90: number;
  releasesPerMonth: number;
  lastRelease: ReleaseLite | null;
  nextRelease: ReleaseLite | null;
  recentReleases: ReleaseLite[];
  monthlyListeners: number | null;
  listenersDelta7: number | null;
  artistCount: number | null;
};
type Item = {
  id: string;
  tipo: Tipo;
  name: string;
  sello: string | null;
  aliases: string[];
  photoUrl: string | null;
  autoPhotoUrl: string | null;
  info: string | null;
  estado: Estado;
  foco: string | null;
  proximoPaso: string | null;
  autoriaPropia: number | null;
  prioridad: boolean;
  sortOrder: number;
  lastReviewAt: string | null;
  lastReviewBy: string | null;
  metrics: Metrics;
};
type Review = {
  id: number;
  estado: Estado;
  foco: string | null;
  proximoPaso: string | null;
  nota: string | null;
  createdAt: string;
  createdBy: string | null;
};

const TIPOS: { key: Tipo; label: string; plural: string }[] = [
  { key: "artista", label: "Artista", plural: "Artistas" },
  { key: "streaming", label: "Streaming", plural: "Streamings" },
  { key: "fiesta", label: "Fiesta", plural: "Fiestas" },
  { key: "sello", label: "Sello", plural: "Sellos" },
  { key: "subsello", label: "Subsello", plural: "Subsellos" },
  { key: "productor", label: "Productor", plural: "Productores" },
  { key: "premiacion", label: "Premiación", plural: "Premiaciones" },
  { key: "distribucion", label: "Distribución", plural: "Distribución" },
];
const TIPO_LABEL = Object.fromEntries(TIPOS.map((t) => [t.key, t.label])) as Record<Tipo, string>;

const ESTADOS: { key: Estado; label: string; color: string; bg: string }[] = [
  { key: "en_marcha", label: "En marcha", color: "var(--good-ink)", bg: "var(--good-bg)" },
  { key: "atencion", label: "Atención", color: "var(--warn-ink)", bg: "var(--warn-bg)" },
  { key: "frenado", label: "Frenado", color: "var(--crit-ink)", bg: "var(--crit-bg)" },
  { key: "sin_revisar", label: "Sin revisar", color: "var(--text-2)", bg: "rgba(255,255,255,.06)" },
];
const ESTADO = Object.fromEntries(ESTADOS.map((e) => [e.key, e])) as Record<Estado, (typeof ESTADOS)[number]>;

// Revisión vencida: la idea es pasar por cada proyecto 2-3 veces por semana.
const STALE_DAYS = 3;

type SortKey = "pizarron" | "pendientes" | "shows" | "musica" | "oyentes";

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function reviewLabel(iso: string | null): string {
  const d = daysSince(iso);
  if (d === null) return "Nunca revisado";
  if (d === 0) return "Revisado hoy";
  if (d === 1) return "Revisado ayer";
  return `Revisado hace ${d} días`;
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function fmtNum(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".0", "")}K`;
  return String(n);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function hasShowsData(t: Tipo) {
  return t === "artista" || t === "streaming" || t === "fiesta";
}
function hasMusicData(t: Tipo) {
  return t !== "fiesta" && t !== "premiacion";
}

function Avatar({ item, size = 52 }: { item: Item; size?: number }) {
  const url = item.photoUrl ?? item.autoPhotoUrl;
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={item.name} className="sg-avatar" style={{ width: size, height: size }} />
  ) : (
    <div className="sg-avatar sg-avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.34 }}>
      {initials(item.name) || "?"}
    </div>
  );
}

function EstadoPill({ estado }: { estado: Estado }) {
  const e = ESTADO[estado] ?? ESTADO.sin_revisar;
  return (
    <span className="sg-pill" style={{ color: e.color, background: e.bg }}>
      <span className="sg-dot" style={{ background: e.color }} />
      {e.label}
    </span>
  );
}

function CardMetrics({ item }: { item: Item }) {
  const m = item.metrics;
  const cells: { label: string; value: string; hint?: string; tone?: "good" | "crit" }[] = [];
  if (hasShowsData(item.tipo)) {
    cells.push({ label: "Shows 7 días", value: String(m.showsNext7) });
    cells.push({ label: "Shows este mes", value: String(m.showsThisMonth), hint: `~${m.showsPerMonth}/mes` });
  }
  if (item.tipo === "sello" || item.tipo === "subsello") {
    cells.push({ label: "Artistas", value: String(m.artistCount ?? 0) });
  }
  if (hasMusicData(item.tipo)) {
    cells.push({ label: "Canciones 30 días", value: String(m.releasesLast30), hint: `~${m.releasesPerMonth}/mes` });
  }
  if (item.tipo === "artista" || item.tipo === "streaming") {
    const d = m.listenersDelta7;
    cells.push({
      label: "Oyentes",
      value: fmtNum(m.monthlyListeners),
      hint: d == null ? undefined : `${d >= 0 ? "+" : ""}${fmtNum(d)} 7d`,
      tone: d == null ? undefined : d >= 0 ? "good" : "crit",
    });
  }
  if (item.tipo === "artista") {
    cells.push({ label: "Autoría propia", value: item.autoriaPropia == null ? "—" : String(item.autoriaPropia) });
  }
  if (cells.length === 0) return null;
  return (
    <div className="sg-metrics">
      {cells.map((c) => (
        <div key={c.label} className="sg-metric">
          <div className="sg-metric-value">{c.value}</div>
          <div className="sg-metric-label">{c.label}</div>
          {c.hint && <div className={`sg-metric-hint${c.tone ? " " + c.tone : ""}`}>{c.hint}</div>}
        </div>
      ))}
    </div>
  );
}

function UnitCard({ item, onOpen }: { item: Item; onOpen: () => void }) {
  const m = item.metrics;
  const stale = (daysSince(item.lastReviewAt) ?? Infinity) >= STALE_DAYS;
  return (
    <button type="button" className={`sg-card${item.prioridad ? " prio" : ""}`} onClick={onOpen}>
      <div className="sg-card-head">
        <Avatar item={item} />
        <div className="sg-card-title">
          <div className="sg-name">
            {item.prioridad && <span className="sg-star" title="Prioridad">★</span>}
            {item.name}
          </div>
          <div className="sg-sub">
            {TIPO_LABEL[item.tipo]}
            {item.sello && item.tipo !== "sello" && item.tipo !== "subsello" ? ` · ${item.sello}` : ""}
          </div>
        </div>
        <EstadoPill estado={item.estado} />
      </div>

      {item.info && <div className="sg-info">{item.info}</div>}

      <div className={`sg-foco${item.foco ? "" : " empty"}`}>
        <span className="sg-foco-label">Foco</span>
        {item.foco ?? "Sin foco cargado — abrí la tarjeta para registrar en qué está."}
      </div>

      <CardMetrics item={item} />

      <div className="sg-lines">
        {m.nextShow && (
          <div className="sg-line">
            <span className="sg-line-k">Próx. show</span>
            {fmtDate(m.nextShow.fecha)}
            {m.nextShow.venue || m.nextShow.ciudad ? ` · ${[m.nextShow.venue, m.nextShow.ciudad].filter(Boolean).join(", ")}` : ""}
          </div>
        )}
        {m.nextRelease && (
          <div className="sg-line">
            <span className="sg-line-k">Próx. lanzamiento</span>
            {fmtDate(m.nextRelease.fecha)} · {m.nextRelease.titulo}
          </div>
        )}
        {!m.nextRelease && m.lastRelease && (
          <div className="sg-line">
            <span className="sg-line-k">Último tema</span>
            {fmtDate(m.lastRelease.fecha)} · {m.lastRelease.titulo}
          </div>
        )}
        {item.proximoPaso && (
          <div className="sg-line">
            <span className="sg-line-k">Próx. paso</span>
            {item.proximoPaso}
          </div>
        )}
      </div>

      <div className={`sg-review${stale ? " stale" : ""}`}>{reviewLabel(item.lastReviewAt)}</div>
    </button>
  );
}

function Drawer({
  item,
  onClose,
  onSaved,
}: {
  item: Item;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [estado, setEstado] = useState<Estado>(item.estado === "sin_revisar" ? "en_marcha" : item.estado);
  const [foco, setFoco] = useState(item.foco ?? "");
  const [proximoPaso, setProximoPaso] = useState(item.proximoPaso ?? "");
  const [nota, setNota] = useState("");
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [info, setInfo] = useState(item.info ?? "");
  const [sello, setSello] = useState(item.sello ?? "");
  const [aliases, setAliases] = useState(item.aliases.join(", "));
  const [autoria, setAutoria] = useState(item.autoriaPropia == null ? "" : String(item.autoriaPropia));
  const [prioridad, setPrioridad] = useState(item.prioridad);
  const [photoUrl, setPhotoUrl] = useState(item.photoUrl ?? "");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch(`/api/seguimiento/${encodeURIComponent(item.id)}/review`)
      .then((r) => r.json())
      .then((d) => setReviews(d.reviews ?? []))
      .catch(() => setReviews([]));
  }, [item.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function saveReview() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/seguimiento/${encodeURIComponent(item.id)}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado, foco, proximoPaso, nota }),
      });
      const d = await res.json();
      if (d.error) {
        setMsg(d.error);
        return;
      }
      onSaved();
      onClose();
    } catch (e) {
      setMsg(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function saveFicha(extra?: Record<string, unknown>) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/seguimiento/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          info,
          sello,
          aliases: aliases.split(",").map((a) => a.trim()).filter(Boolean),
          autoriaPropia: autoria === "" ? null : Number(autoria),
          prioridad,
          photoUrl,
          ...extra,
        }),
      });
      const d = await res.json();
      if (d.error) {
        setMsg(d.error);
        return false;
      }
      setMsg("Ficha guardada.");
      onSaved();
      return true;
    } catch (e) {
      setMsg(String(e));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      const blob = await upload(`seguimiento/${item.id}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/seguimiento/upload",
      });
      setPhotoUrl(blob.url);
      await fetch(`/api/seguimiento/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: blob.url }),
      });
      onSaved();
    } catch (e) {
      setMsg(`No se pudo subir la foto: ${String(e)}`);
    } finally {
      setUploading(false);
    }
  }

  async function archive() {
    if (!window.confirm(`¿Sacar "${item.name}" del seguimiento? (Se puede volver a agregar con el mismo nombre.)`)) return;
    if (await saveFicha({ active: false })) onClose();
  }

  const m = item.metrics;
  const preview = { ...item, photoUrl: photoUrl || null };

  return (
    <div className="sg-overlay" onClick={onClose}>
      <aside className="sg-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={item.name}>
        <div className="sg-drawer-head">
          <label className="sg-photo-edit" title="Cambiar foto de perfil">
            <Avatar item={preview} size={72} />
            <span>{uploading ? "Subiendo..." : "Cambiar foto"}</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
          </label>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sg-drawer-name">{item.name}</div>
            <div className="sg-sub">
              {TIPO_LABEL[item.tipo]}
              {item.sello ? ` · ${item.sello}` : ""}
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <EstadoPill estado={item.estado} />
              <span className="sg-sub">{reviewLabel(item.lastReviewAt)}{item.lastReviewBy ? ` · ${item.lastReviewBy}` : ""}</span>
            </div>
          </div>
          <button type="button" className="sg-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <section className="sg-section">
          <div className="sg-section-title">Revisión de hoy</div>
          <div className="sg-estado-row">
            {ESTADOS.filter((e) => e.key !== "sin_revisar").map((e) => (
              <button
                key={e.key}
                type="button"
                className={`sg-estado-btn${estado === e.key ? " on" : ""}`}
                style={estado === e.key ? { color: e.color, background: e.bg, borderColor: e.color } : undefined}
                onClick={() => setEstado(e.key)}
              >
                <span className="sg-dot" style={{ background: e.color }} />
                {e.label}
              </button>
            ))}
          </div>
          <label className="sg-field">
            <span>¿En qué está enfocado?</span>
            <textarea
              rows={2}
              value={foco}
              onChange={(e) => setFoco(e.target.value)}
              placeholder="Ej: no sacó música este mes, está enfocado en shows en el interior y grabando el EP."
            />
          </label>
          <label className="sg-field">
            <span>Próximo paso</span>
            <input value={proximoPaso} onChange={(e) => setProximoPaso(e.target.value)} placeholder="Ej: cerrar fecha de lanzamiento del single" />
          </label>
          <label className="sg-field">
            <span>Nota de esta revisión (queda en el historial)</span>
            <textarea rows={2} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Opcional" />
          </label>
          <button type="button" className="sg-primary" disabled={saving} onClick={saveReview}>
            {saving ? "Guardando..." : "Guardar revisión"}
          </button>
        </section>

        <section className="sg-section">
          <div className="sg-section-title">Números</div>
          <CardMetrics item={item} />
          {hasShowsData(item.tipo) && (
            <div className="sg-statline">
              {m.showsNext30} shows en los próximos 30 días · {m.showsLast30} en los últimos 30
            </div>
          )}
          {hasMusicData(item.tipo) && (
            <div className="sg-statline">
              {m.releasesLast90} canciones en los últimos 90 días · promedio {m.releasesPerMonth}/mes (6 meses)
            </div>
          )}
        </section>

        {hasShowsData(item.tipo) && (
          <section className="sg-section">
            <div className="sg-section-title">Próximos shows (agenda de Booking)</div>
            {m.upcomingShows.length === 0 ? (
              <div className="sg-empty">Sin shows cargados en la agenda.</div>
            ) : (
              <ul className="sg-list">
                {m.upcomingShows.map((s, i) => (
                  <li key={i}>
                    <strong>{fmtDate(s.fecha)}</strong> · {[s.venue, s.ciudad].filter(Boolean).join(", ") || "Sin lugar"}
                    <span className="sg-tag">{s.estado}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {hasMusicData(item.tipo) && (
          <section className="sg-section">
            <div className="sg-section-title">Música</div>
            {m.nextRelease && (
              <div className="sg-statline">
                <strong>Próximo:</strong> {fmtDate(m.nextRelease.fecha)} · {m.nextRelease.titulo}
                {m.nextRelease.estado ? <span className="sg-tag">{m.nextRelease.estado}</span> : null}
              </div>
            )}
            {m.recentReleases.length === 0 ? (
              <div className="sg-empty">No sacó música en los últimos 6 meses (según catálogo).</div>
            ) : (
              <ul className="sg-list">
                {m.recentReleases.map((r, i) => (
                  <li key={i}>
                    <strong>{fmtDate(r.fecha)}</strong> · {r.titulo}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="sg-section">
          <div className="sg-section-title">Ficha</div>
          <label className="sg-field">
            <span>Información breve</span>
            <textarea rows={2} value={info} onChange={(e) => setInfo(e.target.value)} placeholder="Género, de dónde es, qué lo hace distinto..." />
          </label>
          <div className="sg-grid2">
            <label className="sg-field">
              <span>Sello</span>
              <input value={sello} onChange={(e) => setSello(e.target.value)} />
            </label>
            {item.tipo === "artista" && (
              <label className="sg-field">
                <span>Temas de autoría propia</span>
                <input type="number" min={0} value={autoria} onChange={(e) => setAutoria(e.target.value)} />
              </label>
            )}
          </div>
          <label className="sg-field">
            <span>Otros nombres (separados por coma) — para cruzar con agenda y catálogo</span>
            <input value={aliases} onChange={(e) => setAliases(e.target.value)} />
          </label>
          <label className="sg-field">
            <span>Foto (URL) — o tocá la foto de arriba para subir una</span>
            <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://..." />
          </label>
          <label className="sg-check">
            <input type="checkbox" checked={prioridad} onChange={(e) => setPrioridad(e.target.checked)} />
            Prioridad (aparece primero y con estrella)
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="sg-secondary" disabled={saving} onClick={() => saveFicha()}>
              Guardar ficha
            </button>
            <button type="button" className="sg-danger" disabled={saving} onClick={archive}>
              Sacar del seguimiento
            </button>
          </div>
          {msg && <div className="sg-msg">{msg}</div>}
        </section>

        <section className="sg-section">
          <div className="sg-section-title">Historial de revisiones</div>
          {reviews === null ? (
            <div className="sg-empty">Cargando...</div>
          ) : reviews.length === 0 ? (
            <div className="sg-empty">Todavía no hay revisiones.</div>
          ) : (
            <ul className="sg-history">
              {reviews.map((r) => (
                <li key={r.id}>
                  <div className="sg-history-head">
                    <EstadoPill estado={r.estado} />
                    <span className="sg-sub">
                      {new Date(r.createdAt).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })}
                      {r.createdBy ? ` · ${r.createdBy}` : ""}
                    </span>
                  </div>
                  {r.foco && <div><span className="sg-line-k">Foco</span>{r.foco}</div>}
                  {r.proximoPaso && <div><span className="sg-line-k">Próx. paso</span>{r.proximoPaso}</div>}
                  {r.nota && <div className="sg-sub" style={{ marginTop: 2 }}>{r.nota}</div>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}

function AddUnit({ defaultTipo, onAdded }: { defaultTipo: Tipo; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<Tipo>(defaultTipo);
  const [name, setName] = useState("");
  const [sello, setSello] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/seguimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, name: name.trim(), sello: sello.trim() || null }),
      });
      const d = await res.json();
      if (d.error) setMsg(d.error);
      else {
        setName("");
        setSello("");
        setOpen(false);
        onAdded();
      }
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="sg-secondary"
        onClick={() => {
          setTipo(defaultTipo);
          setOpen(true);
        }}
      >
        + Agregar proyecto
      </button>
    );
  }
  return (
    <form className="sg-add" onSubmit={submit}>
      <select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}>
        {TIPOS.map((t) => (
          <option key={t.key} value={t.key}>
            {t.label}
          </option>
        ))}
      </select>
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
      <input value={sello} onChange={(e) => setSello(e.target.value)} placeholder="Sello (opcional)" />
      <button type="submit" className="sg-primary" disabled={saving}>
        {saving ? "..." : "Agregar"}
      </button>
      <button type="button" className="sg-secondary" onClick={() => setOpen(false)}>
        Cancelar
      </button>
      {msg && <span className="sg-msg">{msg}</span>}
    </form>
  );
}

export default function SeguimientoPage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tipo | "todos">("todos");
  const [q, setQ] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<Estado | null>(null);
  const [onlyPending, setOnlyPending] = useState(false);
  const [sort, setSort] = useState<SortKey>("pizarron");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/seguimiento")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setItems(d.items);
          setGeneratedAt(d.generatedAt);
          setError(null);
        }
      })
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of items ?? []) c[i.tipo] = (c[i.tipo] ?? 0) + 1;
    return c;
  }, [items]);

  const kpis = useMemo(() => {
    const all = items ?? [];
    const reviewed = all.filter((i) => (daysSince(i.lastReviewAt) ?? Infinity) < STALE_DAYS).length;
    return {
      total: all.length,
      reviewed,
      alerta: all.filter((i) => i.estado === "atencion" || i.estado === "frenado").length,
      shows7: all.filter((i) => i.tipo === "artista").reduce((s, i) => s + i.metrics.showsNext7, 0),
      showsMes: all.filter((i) => i.tipo === "artista").reduce((s, i) => s + i.metrics.showsThisMonth, 0),
      canciones30: all.find((i) => i.tipo === "distribucion")?.metrics.releasesLast30 ??
        all.filter((i) => i.tipo === "artista").reduce((s, i) => s + i.metrics.releasesLast30, 0),
      sinMusica: all.filter((i) => i.tipo === "artista" && i.metrics.releasesLast90 === 0).length,
    };
  }, [items]);

  const visible = useMemo(() => {
    const needle = q
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .trim();
    const list = (items ?? []).filter((i) => {
      if (tab !== "todos" && i.tipo !== tab) return false;
      if (estadoFilter && i.estado !== estadoFilter) return false;
      if (onlyPending && (daysSince(i.lastReviewAt) ?? Infinity) < STALE_DAYS) return false;
      if (needle) {
        const hay = [i.name, i.sello ?? "", ...i.aliases, i.foco ?? ""]
          .join(" ")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "");
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const prio = (a: Item, b: Item) => Number(b.prioridad) - Number(a.prioridad);
    const by: Record<SortKey, (a: Item, b: Item) => number> = {
      pizarron: (a, b) => prio(a, b) || a.sortOrder - b.sortOrder,
      pendientes: (a, b) =>
        (daysSince(b.lastReviewAt) ?? 9999) - (daysSince(a.lastReviewAt) ?? 9999) || a.sortOrder - b.sortOrder,
      shows: (a, b) => b.metrics.showsNext30 - a.metrics.showsNext30 || b.metrics.showsThisMonth - a.metrics.showsThisMonth,
      musica: (a, b) => b.metrics.releasesLast90 - a.metrics.releasesLast90,
      oyentes: (a, b) => (b.metrics.monthlyListeners ?? -1) - (a.metrics.monthlyListeners ?? -1),
    };
    return [...list].sort(by[sort]);
  }, [items, tab, q, estadoFilter, onlyPending, sort]);

  const grouped = useMemo(() => {
    if (tab !== "todos") return [{ tipo: tab, items: visible }];
    return TIPOS.map((t) => ({ tipo: t.key, items: visible.filter((i) => i.tipo === t.key) })).filter((g) => g.items.length);
  }, [visible, tab]);

  const openItem = items?.find((i) => i.id === openId) ?? null;

  return (
    <RequireRole allow={["admin", "management"]}>
      <div className="sg-root bg-atmosphere">
        <style>{CSS}</style>
        <div className="sg-inner">
          <div className="sg-crumb">
            <Link href="/dashboard">Dashboard</Link> › Seguimiento
          </div>
          <div className="sg-header">
            <div>
              <h1>Seguimiento de proyectos</h1>
              <p className="sg-subtitle">
                Artistas, streamings, fiestas, sellos, subsellos, productores, premiaciones y distribución — en qué está cada
                uno. Pensado para revisar 2-3 veces por semana.
                {generatedAt && (
                  <> · Datos al {new Date(generatedAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</>
                )}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
              <button type="button" className="sg-secondary" onClick={() => window.print()}>
                Imprimir / PDF
              </button>
              <AddUnit defaultTipo={tab === "todos" ? "artista" : tab} onAdded={load} />
            </div>
          </div>

          {error && <div className="sg-error">Error: {error}</div>}

          <div className="sg-kpis">
            <div className="sg-kpi">
              <div className="sg-kpi-v">
                {kpis.reviewed}
                <span>/{kpis.total}</span>
              </div>
              <div className="sg-kpi-l">Revisados (últimos {STALE_DAYS} días)</div>
              <div className="sg-progress">
                <div style={{ width: `${kpis.total ? (kpis.reviewed / kpis.total) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="sg-kpi">
              <div className="sg-kpi-v" style={{ color: kpis.alerta ? "var(--warn-ink)" : undefined }}>{kpis.alerta}</div>
              <div className="sg-kpi-l">En atención o frenados</div>
            </div>
            <div className="sg-kpi">
              <div className="sg-kpi-v">{kpis.shows7}</div>
              <div className="sg-kpi-l">Shows de artistas próximos 7 días</div>
            </div>
            <div className="sg-kpi">
              <div className="sg-kpi-v">{kpis.showsMes}</div>
              <div className="sg-kpi-l">Shows de artistas este mes</div>
            </div>
            <div className="sg-kpi">
              <div className="sg-kpi-v">{kpis.canciones30}</div>
              <div className="sg-kpi-l">Canciones publicadas últimos 30 días</div>
            </div>
            <div className="sg-kpi">
              <div className="sg-kpi-v" style={{ color: kpis.sinMusica ? "var(--crit-ink)" : undefined }}>{kpis.sinMusica}</div>
              <div className="sg-kpi-l">Artistas sin música en 90 días</div>
            </div>
          </div>

          <div className="sg-tabs">
            <button type="button" className={tab === "todos" ? "on" : ""} onClick={() => setTab("todos")}>
              Todos <span>{items?.length ?? 0}</span>
            </button>
            {TIPOS.map((t) => (
              <button key={t.key} type="button" className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>
                {t.plural} <span>{counts[t.key] ?? 0}</span>
              </button>
            ))}
          </div>

          <div className="sg-toolbar">
            <input className="sg-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, sello o foco..." />
            <div className="sg-chips">
              {ESTADOS.map((e) => (
                <button
                  key={e.key}
                  type="button"
                  className={`sg-chip${estadoFilter === e.key ? " on" : ""}`}
                  onClick={() => setEstadoFilter(estadoFilter === e.key ? null : e.key)}
                >
                  <span className="sg-dot" style={{ background: e.color }} />
                  {e.label}
                </button>
              ))}
              <button type="button" className={`sg-chip${onlyPending ? " on" : ""}`} onClick={() => setOnlyPending((v) => !v)}>
                Pendientes de revisar
              </button>
            </div>
            <select className="sg-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="pizarron">Orden del pizarrón</option>
              <option value="pendientes">Más tiempo sin revisar</option>
              <option value="shows">Más shows</option>
              <option value="musica">Más música</option>
              <option value="oyentes">Más oyentes</option>
            </select>
          </div>

          {items === null && !error && <div className="sg-empty" style={{ marginTop: 24 }}>Cargando proyectos...</div>}

          {grouped.map((g) => (
            <section key={g.tipo} className="sg-group">
              {tab === "todos" && (
                <h2 className="sg-group-title">
                  {TIPOS.find((t) => t.key === g.tipo)?.plural} <span>{g.items.length}</span>
                </h2>
              )}
              <div className="sg-grid">
                {g.items.map((i) => (
                  <UnitCard key={i.id} item={i} onOpen={() => setOpenId(i.id)} />
                ))}
              </div>
            </section>
          ))}

          {items !== null && visible.length === 0 && <div className="sg-empty" style={{ marginTop: 24 }}>Nada coincide con el filtro.</div>}

          <p className="sg-foot">
            Shows: agenda de Booking. Música: catálogo + lanzamientos cargados por PM. Oyentes y foto: Chartmetric / ficha del
            artista. Estado, foco y próximo paso: lo que se carga en cada revisión.
          </p>
        </div>

        {openItem && <Drawer key={openItem.id} item={openItem} onClose={() => setOpenId(null)} onSaved={load} />}
      </div>
    </RequireRole>
  );
}

const CSS = `
.sg-root{font-family:var(--font-display);color:var(--text-1);min-height:100vh;padding-bottom:5rem;}
.sg-inner{max-width:1280px;margin:0 auto;padding:2.5rem 2rem 0;}
.sg-crumb{font-size:13px;color:var(--text-3);margin-bottom:1.25rem;}
.sg-crumb a{color:var(--text-2);text-decoration:none;}
.sg-header{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-start;}
.sg-header h1{font-size:30px;font-weight:700;letter-spacing:-.02em;margin:0 0 4px;}
.sg-subtitle{font-size:13px;color:var(--text-3);max-width:720px;margin:0;}
.sg-error{margin-top:16px;padding:10px 14px;border-radius:10px;background:var(--crit-bg);color:var(--crit-ink);font-size:13px;}
.glass,.sg-kpi,.sg-card,.sg-drawer{background:var(--glass-bg);border:1px solid var(--glass-border);backdrop-filter:blur(var(--glass-blur)) saturate(1.7);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.7);box-shadow:var(--shadow-glass);}
.sg-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-top:1.5rem;}
.sg-kpi{border-radius:var(--radius-md);padding:14px 16px;}
.sg-kpi-v{font-size:26px;font-weight:700;letter-spacing:-.02em;}
.sg-kpi-v span{font-size:15px;color:var(--text-3);font-weight:500;}
.sg-kpi-l{font-size:11.5px;color:var(--text-3);margin-top:2px;}
.sg-progress{height:4px;border-radius:4px;background:rgba(255,255,255,.08);margin-top:8px;overflow:hidden;}
.sg-progress div{height:100%;background:var(--accent-color);border-radius:4px;transition:width var(--dur-slow) var(--ease-out);}
.sg-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-top:1.5rem;}
.sg-tabs button{background:transparent;border:1px solid var(--line-soft);color:var(--text-2);padding:7px 13px;border-radius:var(--radius-pill);font-size:13px;cursor:pointer;}
.sg-tabs button span{color:var(--text-3);margin-left:4px;font-size:12px;}
.sg-tabs button.on{background:var(--accent-glass-bg);border-color:var(--accent-glass-border);color:var(--text-1);font-weight:600;}
.sg-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:12px;}
.sg-search{flex:1;min-width:220px;background:var(--bg-2);border:1px solid var(--line-soft);border-radius:10px;padding:9px 12px;color:var(--text-1);font-size:13px;}
.sg-chips{display:flex;gap:6px;flex-wrap:wrap;}
.sg-chip{display:inline-flex;align-items:center;gap:6px;background:transparent;border:1px solid var(--line-soft);color:var(--text-2);padding:6px 11px;border-radius:var(--radius-pill);font-size:12px;cursor:pointer;}
.sg-chip.on{border-color:var(--accent-color);color:var(--text-1);background:rgba(63,198,209,.1);}
.sg-sort,.sg-add select{background:var(--bg-2);border:1px solid var(--line-soft);border-radius:10px;padding:8px 10px;color:var(--text-1);font-size:13px;}
.sg-group{margin-top:2rem;}
.sg-group-title{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:600;margin:0 0 12px;}
.sg-group-title span{color:var(--text-2);margin-left:6px;}
.sg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;}
.sg-card{text-align:left;color:inherit;font:inherit;border-radius:var(--radius-lg);padding:16px;cursor:pointer;display:flex;flex-direction:column;gap:10px;transition:transform var(--dur-fast) var(--ease-out),border-color var(--dur-fast) var(--ease-out);}
.sg-card:hover{transform:translateY(-2px);border-color:var(--accent-color-glow);background:var(--glass-bg-strong);}
.sg-card.prio{border-color:rgba(232,211,164,.55);}
.sg-card-head{display:flex;gap:12px;align-items:center;}
.sg-card-title{flex:1;min-width:0;}
.sg-avatar{border-radius:50%;object-fit:cover;flex-shrink:0;border:1px solid var(--glass-border);background:var(--bg-3);}
.sg-avatar-fallback{display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--text-2);}
.sg-name{font-size:15.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sg-star{color:var(--warn-ink);margin-right:5px;}
.sg-sub{font-size:12px;color:var(--text-3);}
.sg-pill{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;padding:4px 9px;border-radius:var(--radius-pill);white-space:nowrap;flex-shrink:0;}
.sg-dot{width:7px;height:7px;border-radius:50%;display:inline-block;flex-shrink:0;}
.sg-info{font-size:12.5px;color:var(--text-2);}
.sg-foco{font-size:13px;line-height:1.4;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid var(--line-soft);}
.sg-foco.empty{color:var(--text-3);font-style:italic;}
.sg-foco-label,.sg-line-k{font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:600;margin-right:6px;font-style:normal;}
.sg-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(78px,1fr));gap:6px;}
.sg-metric{background:rgba(255,255,255,.03);border:1px solid var(--line-soft);border-radius:10px;padding:7px 8px;}
.sg-metric-value{font-size:17px;font-weight:700;}
.sg-metric-label{font-size:10.5px;color:var(--text-3);}
.sg-metric-hint{font-size:10.5px;color:var(--text-2);margin-top:1px;}
.sg-metric-hint.good{color:var(--good-ink);}
.sg-metric-hint.crit{color:var(--crit-ink);}
.sg-lines{display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--text-2);}
.sg-line{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sg-review{font-size:11.5px;color:var(--text-3);margin-top:auto;}
.sg-review.stale{color:var(--warn-ink);}
.sg-foot{font-size:11.5px;color:var(--text-3);margin-top:2.5rem;}
.sg-empty{font-size:13px;color:var(--text-3);}
.sg-primary{background:var(--accent-glass-bg);border:1px solid var(--accent-glass-border);border-radius:10px;padding:9px 16px;color:var(--text-1);font-weight:600;font-size:13px;cursor:pointer;}
.sg-secondary{background:transparent;border:1px solid var(--line);border-radius:10px;padding:8px 14px;color:var(--text-1);font-size:13px;cursor:pointer;}
.sg-danger{background:transparent;border:1px solid var(--crit);border-radius:10px;padding:8px 14px;color:var(--crit-ink);font-size:13px;cursor:pointer;}
.sg-primary:disabled,.sg-secondary:disabled,.sg-danger:disabled{opacity:.5;cursor:default;}
.sg-add{display:flex;gap:6px;flex-wrap:wrap;align-items:center;}
.sg-add input{background:var(--bg-2);border:1px solid var(--line-soft);border-radius:10px;padding:8px 10px;color:var(--text-1);font-size:13px;}
.sg-msg{font-size:12px;color:var(--text-2);margin-top:6px;}
.sg-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:50;display:flex;justify-content:flex-end;}
.sg-drawer{width:min(560px,100%);height:100%;overflow-y:auto;border-radius:0;border-top:none;border-bottom:none;border-right:none;padding:22px;background:var(--bg-1);}
.sg-drawer-head{display:flex;gap:14px;align-items:flex-start;}
.sg-drawer-name{font-size:22px;font-weight:700;letter-spacing:-.01em;}
.sg-photo-edit{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;font-size:10.5px;color:var(--text-3);}
.sg-close{background:transparent;border:1px solid var(--line-soft);color:var(--text-2);border-radius:50%;width:32px;height:32px;cursor:pointer;flex-shrink:0;}
.sg-section{margin-top:22px;padding-top:18px;border-top:1px solid var(--line-soft);display:flex;flex-direction:column;gap:10px;}
.sg-section-title{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:600;}
.sg-estado-row{display:flex;gap:6px;flex-wrap:wrap;}
.sg-estado-btn{display:inline-flex;align-items:center;gap:6px;background:transparent;border:1px solid var(--line);color:var(--text-2);padding:8px 13px;border-radius:var(--radius-pill);font-size:13px;cursor:pointer;}
.sg-estado-btn.on{font-weight:600;}
.sg-field{display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--text-3);}
.sg-field input,.sg-field textarea{background:var(--bg-2);border:1px solid var(--line-soft);border-radius:10px;padding:9px 11px;color:var(--text-1);font-size:13px;font-family:inherit;resize:vertical;}
.sg-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.sg-check{display:flex;gap:8px;align-items:center;font-size:13px;color:var(--text-2);}
.sg-statline{font-size:12.5px;color:var(--text-2);}
.sg-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--text-2);}
.sg-list strong{color:var(--text-1);font-weight:600;}
.sg-tag{margin-left:8px;font-size:10.5px;padding:2px 7px;border-radius:var(--radius-pill);border:1px solid var(--line);color:var(--text-3);}
.sg-history{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px;font-size:13px;color:var(--text-2);}
.sg-history li{padding:10px 12px;border:1px solid var(--line-soft);border-radius:10px;display:flex;flex-direction:column;gap:4px;}
.sg-history-head{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
@media (max-width:640px){.sg-inner{padding:1.5rem 1rem 0;}.sg-grid{grid-template-columns:1fr;}.sg-grid2{grid-template-columns:1fr;}}
@media print{
  .sg-root{background:#fff !important;color:#000;}
  .sg-toolbar,.sg-tabs,.sg-header button,.sg-add,.sg-crumb,.sg-overlay{display:none !important;}
  .sg-card,.sg-kpi{box-shadow:none;backdrop-filter:none;border-color:#ccc;background:#fff;color:#000;break-inside:avoid;}
}
`;
