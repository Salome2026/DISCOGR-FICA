import { sql } from "@vercel/postgres";
import { getRankingLatest } from "@/lib/db/listeners";
import { createAlertIfNew, getAlertThresholds } from "@/lib/db/arAlerts";
import { normalizeName } from "@/lib/participants";

// Roster real para efectos de A&R — "Remix"/"Streamings" son créditos de
// remixer/distribución ajenos, no artistas firmados (misma exclusión que
// lib/arCatalogRevival.ts).
const EXCLUDED_SELLOS = ["Remix", "Streamings"];

// Una alerta que falla nunca debe tumbar el escaneo que la generó — ya
// escribió lo que tenía que escribir en ar_opportunities antes de llegar
// acá, perder esa alerta puntual es aceptable, perder el resto del scan no.
async function safeAlert(input: Parameters<typeof createAlertIfNew>[0]): Promise<boolean> {
  try {
    return !!(await createAlertIfNew(input));
  } catch {
    return false;
  }
}

// Mismo productor acreditado en tracks de 2+ artistas propios distintos
// dentro de la ventana reciente — señal real de que ese productor está
// trabajando activo con el sello, útil para decisiones de A&R (repetirlo,
// ofrecerle más proyectos). Acotado al catálogo interno a propósito: no hay
// ninguna fuente externa de créditos de producción.
export async function detectProducerRepeats(): Promise<{ scanned: number; created: number }> {
  const thresholds = await getAlertThresholds();
  // participants ya viene separado por artista individual — un crédito
  // compuesto ("A|B" en un feat) en artist_display contaría como un solo
  // "artista" falso si se agrupara por ahí, inflando/desinflando el
  // conteo real de artistas distintos que trabajaron con este productor.
  const { rows } = await sql`
    SELECT producer, jsonb_array_elements_text(participants) AS artist_name FROM catalog_tracks
    WHERE producer IS NOT NULL AND producer <> ''
      AND sello IS NOT NULL AND sello NOT IN (${EXCLUDED_SELLOS[0]}, ${EXCLUDED_SELLOS[1]})
      -- release_date es TEXT (no DATE) en catalog_tracks — se compara como
      -- texto contra otro texto en formato ISO, igual que ya hace
      -- lib/db/managementReleases.ts, en vez de castear una columna que
      -- puede tener valores no siempre parseables como fecha real.
      AND release_date >= (CURRENT_DATE - make_interval(days => ${thresholds.producerRepeatWindowDays}))::date::text
  `;

  // Se agrupa por nombre normalizado (no el string crudo) para que
  // variaciones de mayúscula/espacio del mismo productor no cuenten como
  // personas distintas — se guarda el primer nombre "lindo" visto para el
  // mensaje.
  const byProducer = new Map<string, { display: string; artists: Set<string> }>();
  for (const r of rows as { producer: string; artist_name: string }[]) {
    const norm = normalizeName(r.producer);
    if (!norm || !r.artist_name) continue;
    const entry = byProducer.get(norm) ?? { display: r.producer.trim(), artists: new Set<string>() };
    entry.artists.add(r.artist_name);
    byProducer.set(norm, entry);
  }

  let created = 0;
  for (const [norm, { display, artists }] of byProducer) {
    if (artists.size < thresholds.producerRepeatMinArtists) continue;
    const artistList = [...artists].sort().join(", ");
    const ok = await safeAlert({
      alertType: "producer_repeat",
      severity: "info",
      message: `${display} produjo tracks de ${artists.size} artistas propios en los últimos ${thresholds.producerRepeatWindowDays} días: ${artistList}.`,
      dedupeKey: `producer_repeat:${norm}`,
    });
    if (ok) created++;
  }

  return { scanned: byProducer.size, created };
}

// Artista propio sin lanzamiento reciente Y sin crecimiento de audiencia —
// candidato a necesitar contenido/plan nuevo. Ambas condiciones juntas (no
// dos alertas separadas) a propósito: un artista sin lanzamientos pero
// creciendo igual, o un artista con caída pero que acaba de lanzar, no son
// la misma urgencia que las dos cosas a la vez.
export async function detectStalledArtists(): Promise<{ scanned: number; created: number }> {
  const thresholds = await getAlertThresholds();
  const ranking = await getRankingLatest();

  // catalog_tracks.artist_display puede ser un crédito compuesto ("A|B" en
  // un feat) — participants ya viene separado por artista individual (mismo
  // dato que usa lib/roster.ts vía jsonb_array_elements_text), así que un
  // colab reciente de un artista sí cuenta como "lanzó hace poco" para él.
  const { rows: releaseRows } = await sql`
    SELECT jsonb_array_elements_text(participants) AS artist_name, release_date FROM catalog_tracks
    WHERE sello IS NOT NULL AND sello NOT IN (${EXCLUDED_SELLOS[0]}, ${EXCLUDED_SELLOS[1]})
  `;
  const lastReleaseByArtist = new Map<string, string>();
  for (const r of releaseRows as { artist_name: string; release_date: string | null }[]) {
    if (!r.release_date) continue;
    const norm = normalizeName(r.artist_name);
    if (!norm) continue;
    const prev = lastReleaseByArtist.get(norm);
    if (!prev || r.release_date > prev) lastReleaseByArtist.set(norm, r.release_date);
  }

  const now = Date.now();
  let created = 0;
  let scanned = 0;
  for (const row of ranking) {
    if (row.sello && EXCLUDED_SELLOS.includes(row.sello)) continue;
    if (row.monthly_listeners == null || row.prev_30d == null) continue;
    const growing = row.monthly_listeners > row.prev_30d;
    if (growing) continue;

    const lastRelease = lastReleaseByArtist.get(normalizeName(row.artist_name));
    const daysSinceRelease = lastRelease ? Math.floor((now - new Date(lastRelease).getTime()) / 86_400_000) : null;
    // Sin ningún lanzamiento propio registrado se trata como "hace muchísimo" —
    // nunca se inventa una fecha, solo se lo describe así en el mensaje.
    if (daysSinceRelease != null && daysSinceRelease < thresholds.stalledMinDaysSinceRelease) continue;

    scanned++;
    const message = daysSinceRelease != null
      ? `${row.artist_name} no crece hace 30 días y no lanza nada nuevo hace ${daysSinceRelease} días.`
      : `${row.artist_name} no crece hace 30 días y no tiene ningún lanzamiento propio registrado en el catálogo.`;
    const ok = await safeAlert({
      alertType: "stalled_artist",
      severity: "warning",
      message,
      dedupeKey: `stalled_artist:${row.artist_id}`,
    });
    if (ok) created++;
  }

  return { scanned, created };
}
