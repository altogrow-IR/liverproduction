import type { GameData } from "../types.ts";
import {
  CHARACTERS,
  CONFIG,
  FACILITIES,
  ROLES,
  STATS,
  capacity,
  mapSize,
} from "./data.ts";
import { canPlace, initialState } from "./engine.ts";
import { newRequests, requestGoals } from "./requests.ts";
import { emptyCustomization, validCustomization } from "./customization.ts";
const obj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const num = (n: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
const str = (v: unknown) => typeof v === "string";
export function decodeSave(raw: string): GameData {
  const data: unknown = JSON.parse(raw);
  if (!obj(data) || ![1, 2].includes(data.version as number))
    throw Error("unsupported");
  const legacy = data.version === 1;
  data.version = 2;
  const defaults = initialState(1);
  // Version 1 saves created before the request board start with an empty board.
  if (legacy && data.requests === undefined) data.requests = newRequests();
  if (legacy && data.monthlyRoyalty === undefined) data.monthlyRoyalty = 0;
  for (const [key, value] of Object.entries(defaults)) {
    if (!(key in data)) throw Error(`missing ${key}`);
    if (
      value !== null &&
      typeof value !== "object" &&
      typeof data[key] !== typeof value
    )
      throw Error("shape");
  }
  for (const key of [
    "money",
    "agencyExp",
    "monthlyIncome",
    "monthlyExpense",
    "monthlyFans",
    "seed",
    "seconds",
    "day",
    "month",
    "agencyLevel",
    "freeRefreshDay",
    "tutorial",
    "crisisMonths",
  ])
    if (!num(data[key], key === "money" ? -Number.MAX_SAFE_INTEGER : 0))
      throw Error("number");
  if (
    !num(data.agencyLevel, 1, 30) ||
    !Number.isInteger(data.agencyLevel) ||
    !num(data.day, 1, 30) ||
    !Number.isInteger(data.day) ||
    !num(data.month, 1) ||
    !Number.isInteger(data.month) ||
    !num(data.seconds, 0, 45) ||
    data.mapSize !== mapSize(data.agencyLevel as number)
  )
    throw Error("time");
  for (const key of [
    "streamers",
    "staff",
    "facilities",
    "candidates",
    "reports",
    "resultQueue",
    "achievements",
    "logs",
  ])
    if (!Array.isArray(data[key])) throw Error("array");
  if (!num(data.monthlyRoyalty)) throw Error("royalty");
  const settings = data.settings,
    stats = data.stats;
  if (
    !obj(settings) ||
    !["sound", "music", "light"].every((k) => typeof settings[k] === "boolean")
  )
    throw Error("settings");
  if (!obj(stats) || !Object.keys(defaults.stats).every((k) => num(stats[k])))
    throw Error("stats");
  if (
    !obj(data.event) ||
    !num(data.event.type, 0, 4) ||
    !Number.isInteger(data.event.type) ||
    !num(data.event.score) ||
    !num(data.event.entries) ||
    !num(data.event.wins) ||
    typeof data.event.joined !== "boolean" ||
    !str(data.event.lastResult)
  )
    throw Error("event");
  if (legacy && data.event.large === undefined) data.event.large = false;
  if (typeof data.event.large !== "boolean") throw Error("event size");
  if (
    data.choice !== null &&
    (!num(data.choice, 0, 29) || !Number.isInteger(data.choice))
  )
    throw Error("choice");
  if (data.levelNotice !== null && !num(data.levelNotice, 2, 30))
    throw Error("notice");
  const s = data as unknown as GameData;
  const requests = s.requests;
  if (
    !obj(requests) ||
    !num(requests.round, 1, Number.MAX_SAFE_INTEGER - 1) ||
    !Number.isInteger(requests.round) ||
    !num(requests.streams, 0, 2) ||
    !Number.isInteger(requests.streams) ||
    !num(requests.themed, 0, 1) ||
    !Number.isInteger(requests.themed) ||
    !num(requests.rests, 0, 1) ||
    !Number.isInteger(requests.rests) ||
    !Array.isArray(requests.claimed) ||
    new Set(requests.claimed).size !== requests.claimed.length ||
    !requests.claimed.every((id) =>
      requestGoals(s).some((g) => g.id === id && g.value >= g.target),
    )
  )
    throw Error("requests");
  if (
    s.streamers.length > capacity(s.agencyLevel) ||
    s.facilities.length > 64 ||
    s.staff.length > 8 ||
    s.logs.length > 40 ||
    s.reports.length > 12 ||
    s.resultQueue.length > 20
  )
    throw Error("limit");
  const ids = new Set<string>();
  for (const c of s.streamers) {
    if (
      !obj(c) ||
      !CHARACTERS.some((d) => d.id === c.id) ||
      ids.has(c.id) ||
      !obj(c.stats) ||
      !Object.keys(STATS).every((k) =>
        num(c.stats[k as keyof typeof c.stats], 0, 100),
      )
    )
      throw Error("character");
    ids.add(c.id);
    for (const k of ["mood", "fatigue", "affection"] as const)
      if (!num(c[k], 0, 100)) throw Error("status");
    for (const k of ["level", "exp", "fanCount", "lastAutoDay"] as const)
      if (!num(c[k], k === "level" ? 1 : 0)) throw Error("growth");
    if (
      !num(c.rankIndex, 0, 14) ||
      !Number.isInteger(c.rankIndex) ||
      !num(c.rankPoints, -4, 6) ||
      typeof c.auto !== "boolean" ||
      !Array.isArray(c.history) ||
      c.history.length > CONFIG.historyLimit ||
      !Array.isArray(c.memories) ||
      c.memories.length > 20 ||
      !c.memories.every(str)
    )
      throw Error("rank");
    if (c.job !== null) {
      if (
        !obj(c.job) ||
        !["STREAMING", "TRAINING", "RESTING"].includes(c.job.type) ||
        !num(c.job.remaining, 0, 20) ||
        !num(c.job.total, 1, 20) ||
        !s.facilities.some((f) => f.id === c.job!.facilityId)
      )
        throw Error("job");
      if (
        c.job.type === "TRAINING" &&
        !Object.keys(STATS).includes(c.job.stat ?? "")
      )
        throw Error("training");
      if (
        c.job.type === "STREAMING" &&
        c.job.style &&
        !["TALK", "SING", "PROJECT", "ENDURANCE", "COLLAB"].includes(
          c.job.style,
        )
      )
        throw Error("style");
      if (c.job.type === "STREAMING" && !c.job.style) {
        const partner = s.streamers.find((p) => p.id === c.job!.partnerId);
        if (!partner?.job?.style || partner.job.partnerId !== c.id)
          throw Error("collaboration");
      }
    }
    const d = CHARACTERS.find((d) => d.id === c.id)!;
    if (!d.gender) delete c.gender;
    if (legacy) c.customization = emptyCustomization(c.affection >= 40);
    if (!validCustomization(c.customization)) throw Error("customization");
    c.customization.unlocked ||= c.affection >= 40;
    Object.assign(c, {
      name: c.customization.displayName ?? d.name,
      ...(d.gender ? { gender: d.gender } : {}),
      nickname: d.nickname,
      rarity: d.rarity,
      color: d.color,
      preferredStyle: d.preferredStyle,
      trait: d.trait,
      description: d.description,
      bio: d.bio,
    });
  }
  const placed: GameData = { ...s, facilities: [] };
  for (const f of s.facilities) {
    if (
      !obj(f) ||
      !str(f.id) ||
      placed.facilities.some((p) => p.id === f.id) ||
      !FACILITIES.some((d) => d.kind === f.kind) ||
      !num(f.level, 1, 3) ||
      !Number.isInteger(f.level) ||
      !canPlace(placed, f.x, f.y)
    )
      throw Error("facility");
    placed.facilities.push(f);
  }
  for (const p of s.staff)
    if (
      !obj(p) ||
      !(p.role in ROLES) ||
      !str(p.name) ||
      !num(p.salary) ||
      !num(p.level, 1) ||
      !num(p.bonusValue)
    )
      throw Error("staff");
  if (
    !s.candidates.every((id) => CHARACTERS.some((c) => c.id === id)) ||
    !s.achievements.every(str)
  )
    throw Error("ids");
  for (const l of s.logs)
    if (!obj(l) || !num(l.id) || !str(l.text)) throw Error("log");
  for (const c of s.streamers) {
    for (const r of c.history) {
      if (legacy && obj(r)) r.streamerId = c.id;
      if (!legacy && r.streamerId !== c.id) throw Error("result identity");
    }
  }
  for (const r of [
    ...s.resultQueue,
    ...s.streamers.flatMap((c) => c.history),
  ]) {
    if (legacy && obj(r) && !r.streamerId) {
      const original = CHARACTERS.find((c) => c.name === r.name);
      if (original) r.streamerId = original.id;
    }
    if (
      !obj(r) ||
      !s.streamers.some((c) => c.id === r.streamerId) ||
      !str(r.name) ||
      !["TALK", "SING", "PROJECT", "ENDURANCE", "COLLAB"].includes(r.style) ||
      !num(r.fans) ||
      !num(r.revenue) ||
      !num(r.exp) ||
      !num(r.viewers) ||
      !num(r.day, 1, 30) ||
      !num(r.month, 1)
    )
      throw Error("result");
  }
  for (const r of s.reports)
    if (
      !obj(r) ||
      !num(r.month, 1) ||
      !num(r.income) ||
      !num(r.expense) ||
      !num(r.profit, -Number.MAX_SAFE_INTEGER) ||
      !num(r.fans) ||
      !num(r.comparison, -Number.MAX_SAFE_INTEGER) ||
      !str(r.event) ||
      !Array.isArray(r.ranking) ||
      !r.ranking.every((p) => obj(p) && str(p.name) && num(p.fans))
    )
      throw Error("report");
  if (s.started && !s.streamers.length) throw Error("empty");
  return s;
}
export function loadSave(): { state: GameData; error: boolean } {
  try {
    const raw = localStorage.getItem(CONFIG.saveKey);
    return { state: raw ? decodeSave(raw) : initialState(), error: false };
  } catch {
    return { state: initialState(), error: true };
  }
}
export function saveGame(s: GameData): boolean {
  try {
    localStorage.setItem(CONFIG.saveKey, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}
