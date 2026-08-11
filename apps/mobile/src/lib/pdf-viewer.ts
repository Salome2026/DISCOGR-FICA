import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

// Downloads the contract PDF to the cache dir, then hands it to the native
// share sheet — on iOS that opens a Quick Look preview of the PDF itself,
// not just a browser tab. idempotent:true so re-opening the same document
// overwrites the cached copy instead of throwing DestinationAlreadyExists.
export async function openDocument(url: string): Promise<void> {
  const file = await File.downloadFileAsync(url, Paths.cache, { idempotent: true });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri);
  }
}
