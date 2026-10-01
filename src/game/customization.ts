import type { Customization, Streamer } from "../types.ts";

export const BOND_UNLOCK = 40;
export const emptyCustomization = (unlocked = false): Customization => ({
  unlocked,
  displayName: null,
  portraitId: null,
  miniId: null,
  miniMode: "badge",
  miniUsesPortrait: true,
});
export const nameLength = (name: string) =>
  Array.from(
    new Intl.Segmenter("ja", { granularity: "grapheme" }).segment(name),
  ).length;
export const validName = (name: unknown): name is string =>
  typeof name === "string" &&
  name.length <= 256 &&
  name === name.trim() &&
  nameLength(name) >= 1 &&
  nameLength(name) <= 20 &&
  !/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(name);
export const validMediaId = (id: unknown): id is string =>
  typeof id === "string" && /^custom-[a-zA-Z0-9-]{1,80}$/.test(id);
export function validCustomization(value: unknown): value is Customization {
  if (!value || typeof value !== "object") return false;
  const c = value as Customization;
  return (
    typeof c.unlocked === "boolean" &&
    typeof c.miniUsesPortrait === "boolean" &&
    (c.displayName === null || validName(c.displayName)) &&
    (c.portraitId === null || validMediaId(c.portraitId)) &&
    (c.miniId === null || validMediaId(c.miniId)) &&
    ["badge", "figure"].includes(c.miniMode) &&
    (c.unlocked ||
      (c.displayName === null && c.portraitId === null && c.miniId === null))
  );
}
export const canCustomize = (person: Streamer) =>
  person.customization.unlocked || person.affection >= BOND_UNLOCK;
