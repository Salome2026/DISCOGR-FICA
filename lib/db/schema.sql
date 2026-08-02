-- Historial diario de oyentes por artista.
-- Una fila nueva por artista por día — nunca se pisa el registro anterior.
CREATE TABLE IF NOT EXISTS artist_listeners_daily (
  id BIGSERIAL PRIMARY KEY,
  artist_id TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  spotify_id TEXT,
  sello TEXT,
  measured_at DATE NOT NULL,
  monthly_listeners INTEGER,
  followers INTEGER,
  source TEXT NOT NULL DEFAULT 'chartmetric',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  error TEXT,
  UNIQUE (artist_id, measured_at)
);

CREATE INDEX IF NOT EXISTS idx_listeners_artist_date
  ON artist_listeners_daily (artist_id, measured_at DESC);

-- Log de corridas del cron diario, para saber cuándo fue la última
-- actualización general y si hubo errores parciales.
CREATE TABLE IF NOT EXISTS listeners_sync_runs (
  id BIGSERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  artists_ok INTEGER NOT NULL DEFAULT 0,
  artists_failed INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);
