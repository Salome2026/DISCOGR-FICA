import { apiFetch } from "./client";
import type {
  EditorialSplit,
  SplitCard,
  SplitPersonInput,
  SplitPersonOption,
  SplitTrackOption,
} from "../types/editorialSplits";

export function searchSplitTracks(q: string): Promise<{ tracks: SplitTrackOption[] }> {
  return apiFetch(`/api/pm/split-editorial/tracks?q=${encodeURIComponent(q)}`);
}

export function searchSplitPeople(q: string): Promise<{ people: SplitPersonOption[] }> {
  return apiFetch(`/api/pm/split-editorial/people?q=${encodeURIComponent(q)}`);
}

export function createSplit(input: {
  catalogTrackId: string;
  letra: SplitPersonInput[];
  musica: SplitPersonInput[];
}): Promise<{ split: EditorialSplit }> {
  return apiFetch("/api/pm/split-editorial", { method: "POST", body: JSON.stringify(input) });
}

export function listPublishingSplits(estado: "Pendiente" | "Enviado", q?: string): Promise<{ splits: SplitCard[] }> {
  const query = q ? `&q=${encodeURIComponent(q)}` : "";
  return apiFetch(`/api/publishing/splits?estado=${estado}${query}`);
}

export function getPublishingSplit(id: string): Promise<{ split?: EditorialSplit; error?: string }> {
  return apiFetch(`/api/publishing/splits/${id}`);
}

export function markSplitSent(id: string): Promise<{ split: EditorialSplit }> {
  return apiFetch(`/api/publishing/splits/${id}`, { method: "PATCH", body: JSON.stringify({ action: "marcar_enviado" }) });
}
