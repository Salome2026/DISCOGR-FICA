import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { apiBaseUrl, getAuthToken } from "./api";

// Downloads a document to the cache dir, then hands it to the native share
// sheet — on iOS that opens a Quick Look preview of the PDF itself, not
// just a browser tab. idempotent:true so re-opening the same document
// overwrites the cached copy instead of throwing DestinationAlreadyExists.
//
// path is always one of our own proxy routes now (e.g.
// /api/legal/file?url=...), never a direct blob URL — the documents behind
// them are private, so this attaches the same Bearer token apiFetch would.
export async function openDocument(path: string): Promise<void> {
  const url = path.startsWith("http") ? path : `${apiBaseUrl}${path}`;
  const token = await getAuthToken();
  const file = await File.downloadFileAsync(url, Paths.cache, {
    idempotent: true,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri);
  }
}
