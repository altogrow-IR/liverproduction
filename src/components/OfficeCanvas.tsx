import { useEffect, useRef } from "react";
import type { FacilityKind, GameData } from "../types.ts";
import { CONFIG } from "../game/data.ts";
import { canPlace } from "../game/engine.ts";
import {
  iso,
  renderOffice,
  uniso,
  updateActors,
} from "../game/canvas/renderOffice.ts";
import type { Actor, CameraState } from "../game/canvas/renderOffice.ts";
interface Props {
  state: GameData;
  selected: string;
  onSelect: (id: string) => void;
  onFacility: (id: string) => void;
  building: FacilityKind | null;
  ghost: { x: number; y: number } | null;
  onGhost: (p: { x: number; y: number }) => void;
  paused: boolean;
  speed: number;
}
export function OfficeCanvas(props: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const camera = useRef<CameraState>({ x: 0, y: 0, zoom: 1 });
  const latest = useRef(props);
  latest.current = props;
  const transform = useRef({ scale: 1, ox: 0, oy: 0 });
  const actors = useRef<Actor[]>([]);
  const reset = () => {
    camera.current = { x: 0, y: 0, zoom: 1 };
  };
  useEffect(() => {
    const el = canvas.current!;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    let w = 0,
      h = 0,
      frame = 0,
      last = performance.now(),
      time = 0;
    const resize = new ResizeObserver(([entry]) => {
      w = entry.contentRect.width;
      h = entry.contentRect.height;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      el.width = w * dpr;
      el.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    resize.observe(el);
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const p = latest.current;
      if (!p.paused) {
        time += dt;
        updateActors(p.state, actors.current, dt * p.speed);
      } else updateActors(p.state, actors.current, 0);
      transform.current = renderOffice(
        ctx,
        p.state,
        actors.current,
        w,
        h,
        camera.current,
        time,
        p.selected,
        p.ghost
          ? { ...p.ghost, valid: canPlace(p.state, p.ghost.x, p.ghost.y) }
          : null,
      );
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    const pointers = new Map<number, { x: number; y: number }>();
    let moved = false,
      start = { x: 0, y: 0 },
      lastTap = 0;
    const down = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      start = { x: e.clientX, y: e.clientY };
      moved = false;
    };
    const move = (e: PointerEvent) => {
      const previous = pointers.get(e.pointerId);
      if (!previous) return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6)
        moved = true;
      if (pointers.size === 2) {
        const other = [...pointers.entries()].find(
          ([id]) => id !== e.pointerId,
        )![1];
        const before = Math.hypot(previous.x - other.x, previous.y - other.y),
          after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
        camera.current.zoom = Math.min(
          CONFIG.maxZoom,
          Math.max(
            CONFIG.minZoom,
            (camera.current.zoom * after) / Math.max(1, before),
          ),
        );
        moved = true;
      } else {
        camera.current.x += e.clientX - previous.x;
        camera.current.y += e.clientY - previous.y;
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (moved || e.type === "pointercancel") return;
      const bounds = el.getBoundingClientRect(),
        t = transform.current,
        x = (e.clientX - bounds.left - t.ox) / t.scale,
        y = (e.clientY - bounds.top - t.oy) / t.scale;
      const p = latest.current;
      if (p.building) {
        const g = uniso(x, y);
        p.onGhost({ x: Math.floor(g.x), y: Math.floor(g.y) });
        return;
      }
      const actor = actors.current.find((a) => {
        const q = iso(a.x, a.y);
        return Math.abs(q.x - x) < 21 && Math.abs(q.y - y - 26) < 30;
      });
      if (actor && p.state.streamers.some((c) => c.id === actor.id)) {
        p.onSelect(actor.id);
        return;
      }
      const g = uniso(x, y);
      const f = p.state.facilities.find(
        (f) => g.x >= f.x && g.x < f.x + 2 && g.y >= f.y && g.y < f.y + 2,
      );
      if (f) {
        p.onFacility(f.id);
        return;
      }
      const now = performance.now();
      if (now - lastTap < 350) reset();
      lastTap = now;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.current.zoom = Math.min(
        CONFIG.maxZoom,
        Math.max(CONFIG.minZoom, camera.current.zoom - e.deltaY * 0.001),
      );
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
    };
  }, []);
  return (
    <>
      <canvas
        ref={canvas}
        aria-label="事務所の箱庭。ドラッグで移動、ピンチで拡大。施設やライバーはメニューからも選べます。"
      />
      <div className="camera-controls">
        <button
          aria-label="縮小"
          onClick={() =>
            (camera.current.zoom = Math.max(0.7, camera.current.zoom - 0.15))
          }
        >
          −
        </button>
        <button aria-label="カメラをリセット" onClick={reset}>
          ⌖
        </button>
        <button
          aria-label="拡大"
          onClick={() =>
            (camera.current.zoom = Math.min(1.8, camera.current.zoom + 0.15))
          }
        >
          ＋
        </button>
      </div>
    </>
  );
}
