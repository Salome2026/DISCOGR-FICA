import { sql } from "@vercel/postgres";
import { normalizeName } from "@/lib/participants";

// Análisis profundo por artista del roster — a diferencia de ar_opportunities
// (un hallazgo puntual), esto es un perfil por artista real, 1:1, que se
// regenera cuando alguien lo pide. Dos mitades independientes (creative /
// opportunity) porque se generan con prompts y en momentos distintos, pero
// viven en la misma fila — es el mismo artista, no dos entidades.
let ready: Promise<void> | null = null;

export function ensureArArtistProfilesSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS ar_artist_profiles (
          artist_key TEXT PRIMARY KEY,
          artist_name TEXT NOT NULL,
          sello TEXT,
          creative_profile JSONB,
          opportunity_profile JSONB,
          data_snapshot JSONB NOT NULL DEFAULT '{}',
          creative_generated_at TIMESTAMPTZ,
          opportunity_generated_at TIMESTAMPTZ,
          generated_by TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ
        )
      `;
    })();
  }
  return ready;
}

export type ArArtistCreativeProfile = {
  posicionamiento: string;
  diferenciador: string;
  fortalezas: string[];
  debilidades: string[];
  oportunidades: string[];
  identidadVisual: string;
  identidadSonora: string;
  storytelling: string;
  universoCreativo: string;
  comunidad: string;
  direccionArtisticaSugerida: string;
  referenciasNacionales: string[];
  referenciasInternacionales: string[];
  justificacion: string;
};

export type ArArtistOpportunityProfile = {
  sonidosSugeridos: string[];
  generosCompatibles: string[];
  tempoSugerido: string;
  productoresSugeridos: string[];
  featuringsSugeridos: { name: string; motivo: string }[];
  potencialComercial: {
    probabilidadExito: string;
    nivelDeRiesgo: string;
    inversionRecomendada: string;
    mercadosRecomendados: string[];
    justificacion: string;
  };
};

export type ArArtistProfile = {
  artistKey: string;
  artistName: string;
  sello: string | null;
  creativeProfile: ArArtistCreativeProfile | null;
  opportunityProfile: ArArtistOpportunityProfile | null;
  dataSnapshot: Record<string, unknown>;
  creativeGeneratedAt: string | null;
  opportunityGeneratedAt: string | null;
  generatedBy: string | null;
  createdAt: string;
  updatedAt: string | null;
};

function rowToProfile(r: Record<string, unknown>): ArArtistProfile {
  return {
    artistKey: r.artist_key as string,
    artistName: r.artist_name as string,
    sello: (r.sello as string | null) ?? null,
    creativeProfile: (r.creative_profile as ArArtistCreativeProfile | null) ?? null,
    opportunityProfile: (r.opportunity_profile as ArArtistOpportunityProfile | null) ?? null,
    dataSnapshot: (r.data_snapshot as Record<string, unknown>) ?? {},
    creativeGeneratedAt: (r.creative_generated_at as string | null) ?? null,
    opportunityGeneratedAt: (r.opportunity_generated_at as string | null) ?? null,
    generatedBy: (r.generated_by as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

export function artistKeyFor(name: string): string {
  return normalizeName(name);
}

export async function getArtistProfile(artistName: string): Promise<ArArtistProfile | null> {
  await ensureArArtistProfilesSchema();
  const { rows } = await sql`SELECT * FROM ar_artist_profiles WHERE artist_key = ${artistKeyFor(artistName)}`;
  return rows[0] ? rowToProfile(rows[0]) : null;
}

export async function listArtistProfileKeys(): Promise<Set<string>> {
  await ensureArArtistProfilesSchema();
  const { rows } = await sql`SELECT artist_key FROM ar_artist_profiles`;
  return new Set(rows.map((r) => r.artist_key as string));
}

export async function saveCreativeProfile(
  artistName: string,
  sello: string | null,
  dataSnapshot: Record<string, unknown>,
  creativeProfile: ArArtistCreativeProfile,
  actorEmail: string
): Promise<ArArtistProfile> {
  await ensureArArtistProfilesSchema();
  const key = artistKeyFor(artistName);
  const { rows } = await sql`
    INSERT INTO ar_artist_profiles (artist_key, artist_name, sello, creative_profile, data_snapshot, creative_generated_at, generated_by, updated_at)
    VALUES (${key}, ${artistName}, ${sello}, ${JSON.stringify(creativeProfile)}::jsonb, ${JSON.stringify(dataSnapshot)}::jsonb, now(), ${actorEmail}, now())
    ON CONFLICT (artist_key) DO UPDATE SET
      artist_name = ${artistName}, sello = ${sello}, creative_profile = ${JSON.stringify(creativeProfile)}::jsonb,
      data_snapshot = ${JSON.stringify(dataSnapshot)}::jsonb, creative_generated_at = now(),
      generated_by = ${actorEmail}, updated_at = now()
    RETURNING *
  `;
  return rowToProfile(rows[0]);
}

export async function saveOpportunityProfile(
  artistName: string,
  sello: string | null,
  dataSnapshot: Record<string, unknown>,
  opportunityProfile: ArArtistOpportunityProfile,
  actorEmail: string
): Promise<ArArtistProfile> {
  await ensureArArtistProfilesSchema();
  const key = artistKeyFor(artistName);
  const { rows } = await sql`
    INSERT INTO ar_artist_profiles (artist_key, artist_name, sello, opportunity_profile, data_snapshot, opportunity_generated_at, generated_by, updated_at)
    VALUES (${key}, ${artistName}, ${sello}, ${JSON.stringify(opportunityProfile)}::jsonb, ${JSON.stringify(dataSnapshot)}::jsonb, now(), ${actorEmail}, now())
    ON CONFLICT (artist_key) DO UPDATE SET
      artist_name = ${artistName}, sello = ${sello}, opportunity_profile = ${JSON.stringify(opportunityProfile)}::jsonb,
      data_snapshot = ${JSON.stringify(dataSnapshot)}::jsonb, opportunity_generated_at = now(),
      generated_by = ${actorEmail}, updated_at = now()
    RETURNING *
  `;
  return rowToProfile(rows[0]);
}
