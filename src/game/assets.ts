import { CHARACTERS, FACILITIES } from "./data.ts";
const base = import.meta.env?.BASE_URL ?? "./";
// Assign a filename to use a PNG/WebP. Empty entries use original procedural art.
export const STREAMER_ASSETS: Record<
  string,
  { portrait: string; mini: string }
> = Object.fromEntries(
  CHARACTERS.map((c) => [c.id, { portrait: "", mini: "" }]),
);
export const FACILITY_ASSETS: Record<string, string> = Object.fromEntries(
  FACILITIES.map((f) => [f.kind, ""]),
);
export const assetUrl = (path: string) => `${base}${path.replace(/^\//, "")}`;
export const AUDIO_ASSETS = {
  office: "sounds/office.mp3",
  event: "sounds/event.mp3",
  title: "sounds/title.mp3",
  click: "sounds/click.mp3",
  coin: "sounds/coin.mp3",
  build: "sounds/build.mp3",
  success: "sounds/success.mp3",
  levelup: "sounds/levelup.mp3",
  "stream-start": "sounds/stream-start.mp3",
  viral: "sounds/viral.mp3",
};
// Enable each supplied audio file independently; missing files fall back safely.
export const AUDIO_FILES_ENABLED: Partial<
  Record<keyof typeof AUDIO_ASSETS, boolean>
> = {};
let context: AudioContext | undefined;
export function sound(
  enabled: boolean,
  kind: "click" | "success" | "build" | "levelup" = "click",
) {
  if (!enabled) return;
  if (AUDIO_FILES_ENABLED[kind]) {
    const audio = new Audio(assetUrl(AUDIO_ASSETS[kind]));
    audio.volume = 0.35;
    void audio.play().catch(() => synthesizedSound(kind));
    return;
  }
  synthesizedSound(kind);
}
function synthesizedSound(kind: "click" | "success" | "build" | "levelup") {
  try {
    context ??= new AudioContext();
    void context.resume().catch(() => {});
    const time = context.currentTime;
    const notes =
      kind === "levelup"
        ? [523, 659, 784, 1047]
        : kind === "success"
          ? [659, 880]
          : kind === "build"
            ? [330, 523]
            : [620];
    notes.forEach((hz, i) => {
      const osc = context!.createOscillator();
      const gain = context!.createGain();
      osc.type = "sine";
      osc.frequency.value = hz;
      gain.gain.setValueAtTime(0.045, time + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, time + i * 0.1 + 0.18);
      osc.connect(gain);
      gain.connect(context!.destination);
      osc.start(time + i * 0.1);
      osc.stop(time + i * 0.1 + 0.2);
    });
  } catch {
    /* Sound is optional; unsupported devices remain playable. */
  }
}
