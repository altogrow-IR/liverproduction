import type { GameData } from "../types.ts";
import { decodeSave } from "./storage.ts";
import { validMediaId } from "./customization.ts";
import {
  blobDataUrl,
  MAX_BACKUP_BYTES,
  MAX_IMAGE_BYTES,
  mediaIds,
  newMediaId,
  readMedia,
} from "./media.ts";

export async function exportBackup(state: GameData) {
  const images: Record<string, string> = {};
  for (const id of mediaIds(state)) {
    const blob = await readMedia(id);
    if (!blob) throw Error("missing image");
    images[id] = await blobDataUrl(blob);
  }
  const blob = new Blob(
    [
      JSON.stringify({
        format: "hoshimusubi-backup",
        version: 1,
        game: state,
        images,
      }),
    ],
    { type: "application/json" },
  );
  if (blob.size > MAX_BACKUP_BYTES) throw Error("backup limit");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hoshimusubi-${state.month}-${state.day}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function importBackup(raw: string) {
  if (new Blob([raw]).size > MAX_BACKUP_BYTES) throw Error("backup limit");
  const input = JSON.parse(raw);
  if (input?.format !== "hoshimusubi-backup") {
    const state = decodeSave(raw);
    // Old JSON saves never included images. Preserve progress and name even if media is absent.
    return { state, entries: [] as { id: string; blob: Blob }[] };
  }
  if (
    input.version !== 1 ||
    !input.images ||
    typeof input.images !== "object" ||
    Array.isArray(input.images) ||
    Object.keys(input.images).length > 40
  )
    throw Error("backup");
  const state = decodeSave(JSON.stringify(input.game));
  const entries: { id: string; blob: Blob }[] = [];
  const mapping = new Map<string, string>();
  for (const id of mediaIds(state)) {
    const data = input.images[id];
    if (
      !validMediaId(id) ||
      typeof data !== "string" ||
      data.length > MAX_IMAGE_BYTES * 1.4 ||
      !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(data)
    )
      throw Error("image");
    const [header, encoded] = data.split(",");
    const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], {
      type: header.slice(5, header.indexOf(";")),
    });
    if (blob.size > MAX_IMAGE_BYTES) throw Error("image limit");
    const image = await createImageBitmap(blob);
    const valid =
      image.width <= 1024 &&
      image.height <= 1024 &&
      image.width > 0 &&
      image.height > 0;
    image.close();
    if (!valid) throw Error("dimensions");
    const nextId = newMediaId();
    mapping.set(id, nextId);
    entries.push({ id: nextId, blob });
  }
  for (const c of state.streamers) {
    if (c.customization.portraitId)
      c.customization.portraitId = mapping.get(c.customization.portraitId)!;
    if (c.customization.miniId)
      c.customization.miniId = mapping.get(c.customization.miniId)!;
  }
  return { state, entries };
}
