import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { CharacterDef } from "../types.ts";
import { STREAMER_ASSETS, assetUrl } from "../game/assets.ts";
import { useMediaUrl } from "../game/media.ts";
import type { Customization } from "../types.ts";
const paths: Record<string, ReactNode> = {
  home: (
    <>
      <path d="m3 10 9-7 9 7v10H3Z" />
      <path d="M9 20v-7h6v7" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5" />
    </>
  ),
  mic: (
    <>
      <rect x="8" y="2" width="8" height="13" rx="4" />
      <path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8" />
    </>
  ),
  build: (
    <>
      <path d="m4 4 5-2 6 6-2 2 7 8-3 3-8-8-2 2-5-5Z" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18M7 17v-5m5 5V8m5 9V4" />
    </>
  ),
  star: <path d="m12 2 3 6.5 7 1-5 5 1.2 7-6.2-3.4-6.2 3.4 1.2-7-5-5 7-1Z" />,
  settings: (
    <>
      <path d="m9 3 1-2h4l1 2 3 2 3 1v4l-2 2v2l2 2-2 4-3-1-2 2h-4l-2-2-3 1-2-4 2-2v-2l-2-2V6l3-1Z" />
      <circle cx="12" cy="11" r="3" />
    </>
  ),
  bell: (
    <>
      <path d="M5 17h14l-2-4V8a5 5 0 0 0-10 0v5Zm5 3h4" />
    </>
  ),
  heart: <path d="M12 21 3 12C-3 4 7-1 12 6 17-1 27 4 21 12Z" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  check: <path d="m4 12 5 5L20 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  pause: (
    <>
      <path d="M8 4v16M16 4v16" />
    </>
  ),
};
export function Icon({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.star}
    </svg>
  );
}
export function Avatar({
  person,
  large = false,
}: {
  person: CharacterDef & { customization?: Customization };
  large?: boolean;
}) {
  const custom = useMediaUrl(person.customization?.portraitId);
  const path = STREAMER_ASSETS[person.id]?.portrait;
  const source = custom ?? (path ? assetUrl(path) : "");
  const [failed, setFailed] = useState("");
  if (source && failed !== source)
    return (
      <img
        className={`avatar ${large ? "large" : ""}`}
        src={source}
        alt={person.name}
        onError={() => setFailed(source)}
      />
    );
  return (
    <svg
      className={`avatar ${large ? "large" : ""}`}
      viewBox="0 0 160 180"
      role="img"
      aria-label={`${person.name}のオリジナルイラスト`}
    >
      <rect width="160" height="180" rx="20" fill={person.color + "25"} />
      <circle cx="125" cy="28" r="30" fill="#ffffff70" />
      <path d="m18 35 3-7 3 7 7 3-7 3-3 7-3-7-7-3Z" fill="#fff" />
      <path d="M24 180v-44q0-26 29-30h54q29 4 29 30v44" fill={person.color} />
      <path
        d={
          person.gender === "male"
            ? "M42 75q-12-53 36-57 53-3 45 57l-12-12-57 1Z"
            : "M43 62q-5-43 35-44 49-4 45 56l7 62-26-9-47 2-25 9Z"
        }
        fill={person.color}
      />
      <path d="M69 105h22v26H69" fill="#ffe0cc" />
      <ellipse cx="80" cy="76" rx="35" ry="41" fill="#ffe5d3" />
      <path
        d={
          person.gender === "male"
            ? "M42 66q-5-48 40-47 45 0 39 48l-16-15-10 10-5-17-18 19 1-18-19 18Z"
            : "M42 68q-3-49 40-48 48 0 39 51-12-2-26-29-7 23-29 30l6-21q-9 15-30 17Z"
        }
        fill={person.color}
      />
      <ellipse cx="64" cy="79" rx="5" ry="8" fill="#48435f" />
      <ellipse cx="98" cy="79" rx="5" ry="8" fill="#48435f" />
      <circle cx="65" cy="76" r="2" fill="white" />
      <circle cx="99" cy="76" r="2" fill="white" />
      <ellipse cx="54" cy="93" rx="7" ry="3" fill="#f6a9b7" />
      <ellipse cx="107" cy="93" rx="7" ry="3" fill="#f6a9b7" />
      <path
        d="M74 97q7 8 14 0"
        fill="none"
        stroke="#aa6878"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="m52 122 28 13 28-13-9 26-19-12-18 12Z" fill="#fffaf6" />
      <path d="m80 135-10 11 10 5 10-5Z" fill="#637ba2" />
      <path
        d="m115 39 5-11 5 11 12 2-9 9 2 12-10-6-10 6 2-12-9-9Z"
        fill="#ffdf8e"
        stroke="#fffbef"
        strokeWidth="2"
      />
      <path d="M40 166h80" stroke="#ffffff70" strokeWidth="2" />
    </svg>
  );
}
export function Meter({
  value,
  max = 100,
  color = "pink",
  label,
}: {
  value: number;
  max?: number;
  color?: string;
  label?: string;
}) {
  return (
    <div
      className={`meter ${color}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.floor(value)}
    >
      <span
        style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }}
      />
    </div>
  );
}
export function Modal({
  title,
  eyebrow,
  children,
  onClose,
  wide = false,
  fullScreen = false,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose?: () => void;
  wide?: boolean;
  fullScreen?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const el = ref.current!;
    el.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) onClose();
      if (e.key === "Tab") {
        const all = Array.from(
          el.querySelectorAll<HTMLElement>(
            'button:not([disabled]),input,select,[tabindex="0"]',
          ),
        ).filter((x) => x.offsetParent !== null && !x.matches(":disabled"));
        if (!all.length) {
          e.preventDefault();
          return;
        }
        const first = all[0],
          last = all[all.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === el)
        ) {
          e.preventDefault();
          last.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last || document.activeElement === el)
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop">
      <div
        className={`modal ${wide ? "wide" : ""} ${fullScreen ? "customization-modal" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <header className="modal-header">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2>{title}</h2>
          </div>
          {onClose && (
            <button
              className="icon-button"
              aria-label="閉じる"
              onClick={onClose}
            >
              <Icon name="close" />
            </button>
          )}
        </header>
        <div className="modal-body">{children}</div>
        <div className="modal-footnote">
          ⏸ この画面を開いている間、ゲーム時間は止まります
        </div>
      </div>
    </div>
  );
}
export function Count({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const run = (now: number) => {
      const t = Math.min(1, (now - start) / 600);
      setN(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(run);
    };
    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{n.toLocaleString("ja-JP")}</>;
}
