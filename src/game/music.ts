import { AUDIO_ASSETS, AUDIO_FILES_ENABLED, assetUrl } from "./assets.ts";
export function startMusic() {
  if (AUDIO_FILES_ENABLED.office) {
    const audio = new Audio(assetUrl(AUDIO_ASSETS.office));
    audio.loop = true;
    audio.volume = 0.18;
    let fallback: (() => void) | undefined;
    let closed = false;
    void audio.play().catch(() => {
      if (!closed) fallback = synthesizedMusic();
    });
    return () => {
      closed = true;
      audio.pause();
      fallback?.();
    };
  }
  return synthesizedMusic();
}
function synthesizedMusic() {
  let audio: AudioContext;
  try {
    audio = new AudioContext();
    void audio.resume().catch(() => {});
  } catch {
    return () => {};
  }
  const notes = [
    261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23, 261.63, 329.63,
    392, 523.25, 349.23, 329.63, 293.66, 392,
  ];
  let step = 0;
  const play = () => {
    if (audio.state !== "running" || document.hidden) return;
    const now = audio.currentTime;
    const o = audio.createOscillator(),
      g = audio.createGain();
    o.type = "sine";
    o.frequency.value = notes[step++ % notes.length];
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.025, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    o.connect(g);
    g.connect(audio.destination);
    o.start(now);
    o.stop(now + 1);
  };
  play();
  const id = setInterval(play, 560);
  return () => {
    clearInterval(id);
    void audio.close().catch(() => {});
  };
}
