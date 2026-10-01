import { useCallback, useEffect, useRef, useState } from "react";
import type { Action, Customization, GameData } from "../types.ts";
import { initialState, reduceGame } from "../game/engine.ts";
import { loadSave, saveGame } from "../game/storage.ts";
import { sound } from "../game/assets.ts";
import { deleteMedia, mediaIds, writeMedia } from "../game/media.ts";
import { canCustomize, validCustomization } from "../game/customization.ts";
export function useGame() {
  const [loaded] = useState(loadSave);
  const [state, setState] = useState(loaded.state);
  const [corrupt, setCorrupt] = useState(loaded.error);
  const [saveError, setSaveError] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const ref = useRef(state);
  ref.current = state;
  const dispatch = useCallback((action: Action) => {
    const old = ref.current;
    const next = reduceGame(old, action);
    ref.current = next;
    setState(next);
    if (
      action.type !== "TICK" ||
      next.day !== old.day ||
      next.month !== old.month ||
      next.stats.streams !== old.stats.streams ||
      next.stats.training !== old.stats.training ||
      next.requests.rests !== old.requests.rests
    ) {
      if (!saveGame(next)) setSaveError(true);
    }
    if (action.type !== "TICK")
      sound(next.settings.sound, action.type === "BUILD" ? "build" : "click");
    else if (next.agencyLevel !== old.agencyLevel)
      sound(next.settings.sound, "levelup");
    else if (next.stats.streams !== old.stats.streams)
      sound(next.settings.sound, "success");
  }, []);
  useEffect(() => {
    if (corrupt) return;
    const id = setInterval(() => {
      if (!saveGame(ref.current)) setSaveError(true);
    }, 30000);
    const onHide = () => {
      setHidden(document.hidden);
      if (document.hidden && !saveGame(ref.current)) setSaveError(true);
    };
    document.addEventListener("visibilitychange", onHide);
    const onExit = () => saveGame(ref.current);
    window.addEventListener("pagehide", onExit);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onExit);
    };
  }, [corrupt]);
  useEffect(() => {
    if (paused || hidden || !speed || corrupt) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      dispatch({
        type: "TICK",
        delta: Math.min(0.6, (now - last) / 1000) * speed,
      });
      last = now;
    }, 250);
    return () => clearInterval(id);
  }, [speed, paused, hidden, corrupt, dispatch]);
  const commit = (next: GameData) => {
    if (!saveGame(next)) {
      setSaveError(true);
      return false;
    }
    const previousIds = mediaIds(ref.current);
    ref.current = next;
    setState(next);
    setCorrupt(false);
    setSaveError(false);
    void deleteMedia(
      previousIds.filter((id) => !mediaIds(next).includes(id)),
    ).catch(() => {});
    return true;
  };
  const restore = async (
    next: GameData,
    entries: { id: string; blob: Blob }[] = [],
  ) => {
    try {
      await writeMedia(entries);
      if (commit(next)) return true;
    } catch {
      setSaveError(true);
    }
    void deleteMedia(entries.map((e) => e.id)).catch(() => {});
    return false;
  };
  const customize = async (
    id: string,
    customization: Customization,
    entries: { id: string; blob: Blob }[],
  ) => {
    const c = ref.current.streamers.find((c) => c.id === id);
    if (
      !c ||
      ref.current.gameOver ||
      !canCustomize(c) ||
      !validCustomization(customization)
    )
      return false;
    try {
      await writeMedia(entries);
      const next = reduceGame(ref.current, {
        type: "CUSTOMIZE",
        id,
        customization,
      });
      if (commit(next)) return true;
    } catch {
      setSaveError(true);
    }
    void deleteMedia(entries.map((e) => e.id)).catch(() => {});
    return false;
  };
  const reset = () => commit(initialState());
  return {
    state,
    dispatch,
    speed,
    setSpeed,
    setPaused,
    corrupt,
    reset,
    restore,
    customize,
    saveError,
  };
}
