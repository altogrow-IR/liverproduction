import { useEffect, useState } from "react";
import type { GameData } from "../types.ts";

export const MAX_IMAGE_BYTES = 1024 * 1024;
export const MAX_BACKUP_BYTES = 64 * 1024 * 1024;
let database: Promise<IDBDatabase> | undefined;
function db() {
  return (database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("hoshimusubi-media", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("images");
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close();
        database = undefined;
      };
      resolve(request.result);
    };
    request.onerror = () => {
      database = undefined;
      reject(request.error);
    };
    request.onblocked = () => {
      database = undefined;
      reject(Error("blocked"));
    };
  }).catch((error) => {
    database = undefined;
    throw error;
  }));
}
export async function readMedia(id: string): Promise<Blob | undefined> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const request = database
      .transaction("images")
      .objectStore("images")
      .get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function writeMedia(entries: { id: string; blob: Blob }[]) {
  if (!entries.length) return;
  const database = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction("images", "readwrite");
    for (const entry of entries) {
      if (
        !/^image\/(png|jpeg|webp)$/.test(entry.blob.type) ||
        entry.blob.size > MAX_IMAGE_BYTES
      ) {
        tx.abort();
        reject(Error("image limit"));
        return;
      }
      tx.objectStore("images").put(entry.blob, entry.id);
    }
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(tx.error ?? Error("storage"));
  });
}
const urls = new Map<string, Promise<string | undefined>>();
export function mediaUrl(id: string) {
  let pending = urls.get(id);
  if (!pending) {
    pending = readMedia(id)
      .then((blob) => blob && URL.createObjectURL(blob))
      .catch(() => undefined);
    urls.set(id, pending);
  }
  return pending;
}
export function useMediaUrl(id: string | null | undefined) {
  const [loaded, setLoaded] = useState<{ id: string; url?: string }>();
  useEffect(() => {
    let active = true;
    if (id)
      void mediaUrl(id).then((url) => {
        if (active) setLoaded({ id, url });
      });
    return () => {
      active = false;
    };
  }, [id]);
  return loaded?.id === id ? loaded?.url : undefined;
}
export const mediaIds = (s: GameData) =>
  Array.from(
    new Set(
      s.streamers.flatMap((c) =>
        [c.customization.portraitId, c.customization.miniId].filter(
          (id): id is string => !!id,
        ),
      ),
    ),
  );
export async function deleteMedia(ids: string[]) {
  if (!ids.length) return;
  const database = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction("images", "readwrite");
    ids.forEach((id) => tx.objectStore("images").delete(id));
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(tx.error);
  });
  for (const id of ids) {
    void urls.get(id)?.then((url) => {
      if (url) URL.revokeObjectURL(url);
    });
    urls.delete(id);
  }
}
// getRandomValues also works on the HTTP LAN preview used by phones.
export const newMediaId = () =>
  `custom-${Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("")}`;
export function blobDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
