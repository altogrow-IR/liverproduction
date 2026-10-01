import type { Facility, GameData } from "../../types.ts";
import { CONFIG, FACILITIES } from "../data.ts";
import { FACILITY_ASSETS, STREAMER_ASSETS, assetUrl } from "../assets.ts";
import { mini, plant, polygon, round, text } from "./art.ts";
import { mediaUrl } from "../media.ts";
export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}
export interface Actor {
  id: string;
  x: number;
  y: number;
  path: { x: number; y: number }[];
  wait: number;
  phrase: number;
  state: "IDLE" | "WALKING" | "WORKING" | "STREAMING" | "TRAINING" | "RESTING";
  jobKey: string;
}
export const iso = (x: number, y: number) => ({
  x: ((x - y) * CONFIG.tileWidth) / 2,
  y: ((x + y) * CONFIG.tileHeight) / 2,
});
export const uniso = (x: number, y: number) => ({
  x: x / CONFIG.tileWidth + y / CONFIG.tileHeight,
  y: y / CONFIG.tileHeight - x / CONFIG.tileWidth,
});
const images = new Map<string, HTMLImageElement>();
const customImages = new Map<string, HTMLImageElement | null>();
let activeMediaKey = "";
function getCustomImage(id: string | null) {
  if (!id) return null;
  if (!customImages.has(id)) {
    customImages.set(id, null);
    void mediaUrl(id).then((url) => {
      if (!url || !customImages.has(id)) return;
      const img = new Image();
      img.src = url;
      customImages.set(id, img);
    });
  }
  const img = customImages.get(id);
  return img?.complete && img.naturalWidth ? img : null;
}
function getImage(path: string) {
  if (!path) return null;
  let img = images.get(path);
  if (!img) {
    img = new Image();
    img.src = assetUrl(path);
    images.set(path, img);
  }
  return img.complete && img.naturalWidth ? img : null;
}
function cube(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  d: number,
  h: number,
  top: string,
  left: string,
  right: string,
) {
  const a = iso(x, y),
    b = iso(x + w, y),
    c = iso(x + w, y + d),
    e = iso(x, y + d);
  polygon(
    ctx,
    [
      [e.x, e.y],
      [c.x, c.y],
      [c.x, c.y - h],
      [e.x, e.y - h],
    ],
    left,
  );
  polygon(
    ctx,
    [
      [b.x, b.y],
      [c.x, c.y],
      [c.x, c.y - h],
      [b.x, b.y - h],
    ],
    right,
  );
  polygon(
    ctx,
    [
      [a.x, a.y - h],
      [b.x, b.y - h],
      [c.x, c.y - h],
      [e.x, e.y - h],
    ],
    top,
  );
}
function facility(
  ctx: CanvasRenderingContext2D,
  f: Facility,
  s: GameData,
  time: number,
) {
  const d = FACILITIES.find((d) => d.kind === f.kind)!;
  const p = iso(f.x, f.y);
  const a = p;
  const center = iso(f.x + 1, f.y + 1);
  const img = getImage(FACILITY_ASSETS[f.kind]);
  if (img) {
    ctx.drawImage(img, p.x - 84, p.y - 65, 168, 153);
  } else {
    cube(
      ctx,
      f.x + 0.06,
      f.y + 0.06,
      1.88,
      1.88,
      5,
      "#fffaf1",
      "#d6c7b8",
      "#ccbaa9",
    );
    const b = iso(f.x + 2, f.y),
      e = iso(f.x, f.y + 2);
    polygon(
      ctx,
      [
        [e.x, e.y],
        [a.x, a.y],
        [a.x, a.y - 62],
        [e.x, e.y - 62],
      ],
      "#e4edf0",
      "#c1d2dd",
    );
    polygon(
      ctx,
      [
        [a.x, a.y],
        [b.x, b.y],
        [b.x, b.y - 62],
        [a.x, a.y - 62],
      ],
      "#f8fafc",
      "#c1d2dd",
    );
    // Bright wall caps and room trims keep the tiny rooms legible at phone scale.
    polygon(
      ctx,
      [
        [e.x, e.y - 62],
        [a.x, a.y - 62],
        [a.x, a.y - 66],
        [e.x, e.y - 66],
      ],
      d.color,
    );
    polygon(
      ctx,
      [
        [a.x, a.y - 62],
        [b.x, b.y - 62],
        [b.x, b.y - 66],
        [a.x, a.y - 66],
      ],
      d.color,
    );
    if (f.kind === "rest" || f.kind === "cafe") {
      cube(
        ctx,
        f.x + 0.2,
        f.y + 0.3,
        1.1,
        0.45,
        17,
        d.color,
        "#aebfb9",
        "#8daea5",
      );
      cube(
        ctx,
        f.x + 0.2,
        f.y + 0.25,
        1.1,
        0.12,
        29,
        d.color,
        d.color,
        "#9db6ac",
      );
      cube(
        ctx,
        f.x + 0.8,
        f.y + 1.25,
        0.55,
        0.45,
        15,
        "#ffefd7",
        "#d9b997",
        "#bf9f84",
      );
      const t = iso(f.x + 1.05, f.y + 1.47);
      round(ctx, t.x - 4, t.y - 19, 8, 6, 2, "#fff");
      plant(ctx, center.x - 47, center.y + 6, 0.7);
    } else if (f.kind === "goods") {
      for (let i = 0; i < 3; i++) {
        cube(
          ctx,
          f.x + 0.2,
          f.y + 0.2 + i * 0.5,
          1.4,
          0.35,
          25,
          "#efcfaa",
          "#d3ab85",
          "#b38d6d",
        );
        const q = iso(f.x + 0.9, f.y + 0.4 + i * 0.5);
        ["#eaaaaf", "#aaa2df", "#a2cdbb"].forEach((color, k) =>
          round(ctx, q.x + (k - 1) * 16 - 5, q.y - 36, 10, 12, 3, color),
        );
      }
    } else if (f.kind === "studio") {
      cube(
        ctx,
        f.x + 0.2,
        f.y + 0.2,
        1.4,
        0.15,
        44,
        "#9bd3ba",
        "#79b49e",
        "#80bda6",
      );
      const q = iso(f.x + 1.2, f.y + 1.4);
      round(ctx, q.x - 10, q.y - 26, 20, 14, 3, "#44566c");
      ctx.strokeStyle = "#5c6d7c";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(q.x, q.y - 12);
      ctx.lineTo(q.x - 9, q.y + 5);
      ctx.moveTo(q.x, q.y - 12);
      ctx.lineTo(q.x + 9, q.y + 5);
      ctx.stroke();
    } else {
      cube(
        ctx,
        f.x + 0.3,
        f.y + 0.5,
        1.2,
        0.65,
        19,
        "#f3d7b7",
        "#d8b79c",
        "#bc9a83",
      );
      const q = iso(f.x + 0.75, f.y + 0.8);
      round(ctx, q.x - 16, q.y - 48, 32, 23, 3, "#50647e");
      round(
        ctx,
        q.x - 13,
        q.y - 45,
        26,
        17,
        1,
        f.kind === "booth" ? "#c9b8f5" : "#b7e5f4",
      );
      round(ctx, q.x - 3, q.y - 25, 6, 8, 1, "#50647e");
      round(ctx, q.x - 12, q.y - 17, 24, 4, 1, "#657489");
      cube(
        ctx,
        f.x + 1,
        f.y + 1.3,
        0.4,
        0.38,
        12,
        d.color,
        "#a4abc0",
        "#8e99b2",
      );
      if (f.kind === "booth") {
        round(ctx, q.x + 23, q.y - 32, 7, 13, 3, "#445570");
        ctx.strokeStyle = "#445570";
        ctx.beginPath();
        ctx.moveTo(q.x + 26, q.y - 22);
        ctx.lineTo(q.x + 26, q.y - 13);
        ctx.stroke();
      }
      plant(ctx, center.x + 52, center.y - 2, 0.65);
    }
  }
  const streaming = s.streamers.some(
    (c) => c.job?.facilityId === f.id && c.job.type === "STREAMING",
  );
  const labelY = a.y - 66;
  round(
    ctx,
    a.x - 63,
    labelY - 27,
    126,
    26,
    7,
    streaming ? "#ed6e9d" : "#fffef8",
  );
  text(
    ctx,
    streaming ? "● ON AIR" : d.short,
    a.x,
    labelY - 9,
    13,
    streaming ? "white" : "#526078",
    true,
  );
  if (streaming) {
    text(
      ctx,
      "♫",
      center.x + 20,
      center.y - 38 - Math.sin(time * 3) * 6,
      20,
      "#ee75a0",
      true,
    );
  }
  for (let i = 0; i < f.level; i++) {
    ctx.fillStyle = "#edc66b";
    ctx.beginPath();
    ctx.arc(center.x - 7 + i * 7, center.y + 39, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}
export function route(
  s: GameData,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  const start = {
    x: Math.min(s.mapSize - 1, Math.max(0, Math.floor(from.x))),
    y: Math.min(s.mapSize - 1, Math.max(0, Math.floor(from.y))),
  };
  const end = { x: Math.floor(to.x), y: Math.floor(to.y) };
  const key = (x: number, y: number) => `${x},${y}`;
  const queue = [start];
  const seen = new Map<string, { x: number; y: number } | null>([
    [key(start.x, start.y), null],
  ]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (p.x === end.x && p.y === end.y) break;
    for (const [dx, dy] of [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ]) {
      const x = p.x + dx,
        y = p.y + dy;
      if (
        x < 0 ||
        y < 0 ||
        x >= s.mapSize ||
        y >= s.mapSize ||
        seen.has(key(x, y))
      )
        continue;
      if (
        s.facilities.some(
          (f) => x >= f.x && x < f.x + 2 && y >= f.y && y < f.y + 2,
        ) &&
        !(x === end.x && y === end.y)
      )
        continue;
      seen.set(key(x, y), p);
      queue.push({ x, y });
    }
  }
  if (!seen.has(key(end.x, end.y))) return [];
  const path = [];
  let p: { x: number; y: number } | null = end;
  while (p) {
    path.unshift({ x: p.x + 0.5, y: p.y + 0.5 });
    p = seen.get(key(p.x, p.y)) ?? null;
  }
  return path.slice(1);
}
export function updateActors(s: GameData, actors: Actor[], dt: number) {
  const people = [
    ...s.streamers.map((c) => ({ id: c.id, job: c.job })),
    ...s.staff.map((p) => ({ id: p.id, job: null })),
  ];
  for (let i = actors.length - 1; i >= 0; i--) {
    if (!people.some((p) => p.id === actors[i].id)) actors.splice(i, 1);
  }
  for (const p of people) {
    let a = actors.find((a) => a.id === p.id);
    if (!a) {
      const free: { x: number; y: number }[] = [];
      for (let x = 0; x < s.mapSize; x++)
        for (let y = 0; y < s.mapSize; y++) {
          if (
            !s.facilities.some(
              (f) => x >= f.x && x < f.x + 2 && y >= f.y && y < f.y + 2,
            )
          )
            free.push({ x: x + 0.5, y: y + 0.5 });
        }
      const spawn = free[
        (people.indexOf(p) * 11 + Math.floor(free.length * 0.65)) %
          Math.max(1, free.length)
      ] ?? { x: 0.5, y: 0.5 };
      a = {
        id: p.id,
        x: spawn.x,
        y: spawn.y,
        path: [],
        wait: 1,
        phrase: 0,
        state: "IDLE",
        jobKey: "",
      };
      actors.push(a);
    }
    const jobKey = p.job ? `${p.job.facilityId}-${p.job.type}` : "";
    if (jobKey !== a.jobKey) {
      a.jobKey = jobKey;
      a.path = [];
      if (p.job) {
        const f = s.facilities.find((f) => f.id === p.job!.facilityId);
        if (f) {
          const targets = [
            { x: f.x + 1, y: f.y + 2 },
            { x: f.x + 2, y: f.y + 1 },
            { x: f.x, y: f.y - 1 },
            { x: f.x - 1, y: f.y },
          ];
          a.path =
            targets.map((t) => route(s, a!, t)).find((r) => r.length > 0) ?? [];
        }
      }
      a.wait = 0;
    }
    if (a.path.length) {
      a.state = "WALKING";
      const to = a.path[0],
        dx = to.x - a.x,
        dy = to.y - a.y,
        d = Math.hypot(dx, dy),
        step = dt * 1.6;
      if (d <= step) {
        a.x = to.x;
        a.y = to.y;
        a.path.shift();
      } else {
        a.x += (dx / d) * step;
        a.y += (dy / d) * step;
      }
    } else if (p.job) a.state = p.job.type;
    else {
      a.state = "IDLE";
      a.wait -= dt;
      if (a.wait <= 0) {
        a.phrase = (a.phrase + 1) % 8;
        const x = Math.floor(Math.random() * s.mapSize),
          y = Math.floor(Math.random() * s.mapSize);
        if (
          !s.facilities.some(
            (f) => x >= f.x && x < f.x + 2 && y >= f.y && y < f.y + 2,
          )
        )
          a.path = route(s, a, { x, y });
        a.wait = 3 + Math.random() * 5;
      }
    }
  }
}
export function renderOffice(
  ctx: CanvasRenderingContext2D,
  s: GameData,
  actors: Actor[],
  width: number,
  height: number,
  camera: CameraState,
  time: number,
  selected: string,
  ghost: { x: number; y: number; valid: boolean } | null,
) {
  const mediaKey = s.streamers
    .map((c) => c.customization.miniId ?? "")
    .join(",");
  if (mediaKey !== activeMediaKey) {
    activeMediaKey = mediaKey;
    const active = new Set(s.streamers.map((c) => c.customization.miniId));
    for (const id of customImages.keys())
      if (!active.has(id)) customImages.delete(id);
  }
  ctx.clearRect(0, 0, width, height);
  const fit = Math.min(
    width / (s.mapSize * 84 + 120),
    (height - 12) / (s.mapSize * 44 + 155),
  );
  const scale = fit * camera.zoom;
  const ox = width / 2 + camera.x,
    oy = height / 2 - (s.mapSize * 22 - 25) * scale + camera.y;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  // Floating garden foundation and a walk around the office.
  cube(
    ctx,
    -0.65,
    -0.65,
    s.mapSize + 1.3,
    s.mapSize + 1.3,
    0,
    "#c6ddcf",
    "#c6ddcf",
    "#c6ddcf",
  );
  const far = iso(s.mapSize + 0.65, s.mapSize + 0.65),
    left = iso(-0.65, s.mapSize + 0.65),
    right = iso(s.mapSize + 0.65, -0.65);
  polygon(
    ctx,
    [
      [left.x, left.y],
      [far.x, far.y],
      [far.x, far.y + 16],
      [left.x, left.y + 16],
    ],
    "#8fb3a5",
  );
  polygon(
    ctx,
    [
      [right.x, right.y],
      [far.x, far.y],
      [far.x, far.y + 16],
      [right.x, right.y + 16],
    ],
    "#779c91",
  );
  for (let x = 0; x < s.mapSize; x++)
    for (let y = 0; y < s.mapSize; y++) {
      const p = iso(x, y);
      polygon(
        ctx,
        [
          [p.x, p.y],
          [p.x + 42, p.y + 22],
          [p.x, p.y + 44],
          [p.x - 42, p.y + 22],
        ],
        (x + y) % 2 === 0 ? "#fff7e9" : "#f7ecda",
        "#e7dccd",
      );
    }
  const back = iso(0, 0),
    bl = iso(0, s.mapSize),
    br = iso(s.mapSize, 0);
  polygon(
    ctx,
    [
      [bl.x, bl.y],
      [back.x, back.y],
      [back.x, back.y - 42],
      [bl.x, bl.y - 42],
    ],
    "#dfebf1",
    "#bbcfd9",
  );
  polygon(
    ctx,
    [
      [back.x, back.y],
      [br.x, br.y],
      [br.x, br.y - 42],
      [back.x, back.y - 42],
    ],
    "#eff5f9",
    "#bbcfd9",
  );
  for (let i = 1; i < s.mapSize; i += 2) {
    const p = iso(i, 0.01);
    polygon(
      ctx,
      [
        [p.x - 17, p.y - 31],
        [p.x + 15, p.y - 14],
        [p.x + 15, p.y - 2],
        [p.x - 17, p.y - 19],
      ],
      "#c6e1ec",
      "#aacbdc",
    );
    const q = iso(-0.35, i);
    plant(ctx, q.x, q.y, 0.85);
  }
  const decorations = [
    iso(s.mapSize + 0.3, 1),
    iso(s.mapSize + 0.3, s.mapSize - 1),
    iso(1, s.mapSize + 0.3),
  ];
  decorations.forEach((p) => plant(ctx, p.x, p.y, 1.25));
  const entries: [number, () => void][] = [];
  for (const f of s.facilities)
    entries.push([f.x + f.y + 2, () => facility(ctx, f, s, time)]);
  for (const a of actors) {
    const c = s.streamers.find((c) => c.id === a.id);
    entries.push([
      a.x + a.y + 0.2,
      () => {
        const p = iso(a.x, a.y);
        const custom = getCustomImage(c?.customization.miniId ?? null);
        const img = custom ?? getImage(c ? STREAMER_ASSETS[c.id]?.mini : "");
        if (img) {
          ctx.save();
          ctx.fillStyle = "#48596d26";
          ctx.beginPath();
          ctx.ellipse(p.x, p.y + 2, 12, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          if (selected === a.id) {
            ctx.strokeStyle = "#ed7fa8";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y + 3, 16, 7, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          const bob = s.settings.light
            ? 0
            : Math.abs(Math.sin(time * (a.state === "WALKING" ? 10 : 2))) * 2;
          if (custom && c?.customization.miniMode === "badge") {
            ctx.beginPath();
            ctx.arc(p.x, p.y - 30 - bob, 22, 0, Math.PI * 2);
            ctx.clip();
            ctx.fillStyle = "#fff9f3";
            ctx.fillRect(p.x - 22, p.y - 52 - bob, 44, 44);
            ctx.drawImage(img, p.x - 22, p.y - 52 - bob, 44, 44);
          } else {
            const scale = Math.min(
              40 / img.naturalWidth,
              56 / img.naturalHeight,
            );
            const w = img.naturalWidth * scale,
              h = img.naturalHeight * scale;
            ctx.drawImage(img, p.x - w / 2, p.y - h - bob, w, h);
          }
          ctx.restore();
        } else
          mini(
            ctx,
            p.x,
            p.y,
            c?.color ?? "#688bad",
            s.settings.light ? 0 : time * (a.state === "WALKING" ? 10 : 2),
            selected === a.id,
            c?.gender === "male",
          );
        if (selected === a.id && c)
          text(ctx, c.name, p.x, p.y + 20, 10, "#4a5368", true, 110);
        const active = c?.job;
        const phrases = [
          "今日は何を話そう？",
          "もっと上手くなりたい！",
          "ここが私の居場所。",
          "ファン増えてる！",
          "明日もがんばろう！",
          "休憩も大切だね。",
          "いつもありがとう！",
          "大きな夢に向かって！",
        ];
        const show =
          active ||
          (!s.settings.light &&
            Math.floor(time / 4 + actors.indexOf(a)) % 4 === 0);
        if (show) {
          const msg = active
            ? active.type === "STREAMING"
              ? "配信いってきます ♫"
              : active.type === "RESTING"
                ? "ちょっと休憩〜"
                : "練習、がんばる！"
            : c && c.fatigue >= 70
              ? "ちょっと疲れた……"
              : phrases[a.phrase];
          const w = msg.length * 9 + 14;
          round(ctx, p.x - w / 2, p.y - 80, w, 23, 8, "#fffef9");
          polygon(
            ctx,
            [
              [p.x - 3, p.y - 58],
              [p.x + 3, p.y - 58],
              [p.x, p.y - 53],
            ],
            "#fffef9",
          );
          text(ctx, msg, p.x, p.y - 64, 9, "#53617a");
        }
      },
    ]);
  }
  entries.sort((a, b) => a[0] - b[0]).forEach(([, draw]) => draw());
  if (ghost) {
    const p = iso(ghost.x, ghost.y);
    polygon(
      ctx,
      [
        [p.x, p.y],
        [p.x + 84, p.y + 44],
        [p.x, p.y + 88],
        [p.x - 84, p.y + 44],
      ],
      ghost.valid ? "#64c7b57d" : "#ec70917d",
      ghost.valid ? "#278c77" : "#cf466c",
    );
    text(
      ctx,
      ghost.valid ? "＋ ここに建設" : "配置できません",
      p.x,
      p.y + 45,
      12,
      ghost.valid ? "#155f51" : "#9b2344",
      true,
    );
  }
  ctx.restore();
  return { scale, ox, oy };
}
