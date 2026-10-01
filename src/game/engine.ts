import type {
  Action,
  CharacterDef,
  Facility,
  FacilityKind,
  GameData,
  Stat,
  Streamer,
  StreamResult,
  Style,
} from "../types.ts";
import {
  ACHIEVEMENTS,
  CHARACTERS,
  CONFIG,
  EVENTS,
  FACILITIES,
  NPCS,
  PRICES,
  RANDOM_EVENTS,
  RANKS,
  ROLES,
  SLOTS,
  STATS,
  STYLES,
  capacity,
  mapSize,
  neededExp,
  staffCapacity,
} from "./data.ts";

import { newRequests, requestGoals, requestTheme } from "./requests.ts";
import {
  canCustomize,
  emptyCustomization,
  validCustomization,
} from "./customization.ts";
import { STARTER_IDS } from "./data.ts";

export const clamp = (n: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, n));
export function random(s: GameData) {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
export const totalFans = (s: GameData) =>
  s.streamers.reduce((n, c) => n + c.fanCount, 0);
export const absoluteDay = (s: GameData) => (s.month - 1) * 30 + s.day;
export function createStreamer(d: CharacterDef): Streamer {
  return {
    ...structuredClone(d),
    customization: emptyCustomization(),
    level: 1,
    exp: 0,
    fanCount: 0,
    mood: 80,
    fatigue: 0,
    affection: 0,
    rankIndex: 0,
    rankPoints: 0,
    history: [],
    memories: ["小さな事務所で、夢への一歩を踏み出した。"],
    job: null,
    auto: false,
    lastAutoDay: 0,
  };
}
export function initialState(seed = Date.now() >>> 0): GameData {
  return {
    version: 2,
    requests: newRequests(),
    started: false,
    money: 300000,
    agencyLevel: 1,
    agencyExp: 0,
    day: 1,
    month: 1,
    seconds: 0,
    streamers: [],
    staff: [],
    facilities: [
      { id: "f1", kind: "booth", x: 1, y: 1, level: 1 },
      { id: "f2", kind: "rest", x: 5, y: 1, level: 1 },
      { id: "f3", kind: "desk", x: 1, y: 5, level: 1 },
    ],
    mapSize: 8,
    candidates: ["momo", "ao", "noa"],
    freeRefreshDay: 1,
    monthlyIncome: 0,
    monthlyExpense: 0,
    monthlyRoyalty: 0,
    monthlyFans: 0,
    reports: [],
    resultQueue: [],
    reportPending: false,
    levelNotice: null,
    event: {
      joined: false,
      large: false,
      type: 0,
      score: 0,
      lastResult: "まだ参加していません",
      wins: 0,
      entries: 0,
    },
    choice: null,
    achievements: [],
    logs: [{ id: 0, text: "星むすびプロダクションへようこそ！" }],
    tutorial: 0,
    stats: {
      streams: 0,
      scouts: 0,
      builds: 0,
      training: 0,
      viral: 0,
      revenue: 0,
      maxMonthly: 0,
      months: 0,
      contracts: 0,
    },
    crisisMonths: 0,
    gameOver: false,
    milestone: false,
    settings: { sound: false, music: false, light: false },
    seed,
  };
}
export function log(s: GameData, text: string) {
  s.logs.unshift({ id: (s.logs[0]?.id ?? 0) + 1, text });
  s.logs = s.logs.slice(0, 40);
}
function income(s: GameData, n: number) {
  s.money += n;
  s.monthlyIncome += n;
  s.stats.revenue += n;
}
function pay(s: GameData, n: number) {
  s.money -= n;
  s.monthlyExpense += n;
}
function affordable(s: GameData, n: number) {
  if (s.money < n) {
    log(s, "資金が足りません。配信や実績報酬で資金を集めましょう。");
    return false;
  }
  return true;
}
export function agencyExp(s: GameData, n: number) {
  s.agencyExp += n;
  while (s.agencyLevel < 30 && s.agencyExp >= neededExp(s.agencyLevel)) {
    s.agencyExp -= neededExp(s.agencyLevel);
    s.agencyLevel++;
    s.mapSize = mapSize(s.agencyLevel);
    s.levelNotice = s.agencyLevel;
    log(s, `事務所Lv${s.agencyLevel}！ 新しい可能性が広がりました。`);
  }
  if (s.agencyLevel >= 30) {
    s.agencyExp = Math.min(s.agencyExp, neededExp(30));
    s.milestone = true;
  }
}
export function canPlace(s: GameData, x: number, y: number, ignore?: string) {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    y >= 0 &&
    x + 2 <= s.mapSize &&
    y + 2 <= s.mapSize &&
    !s.facilities.some(
      (f) =>
        f.id !== ignore &&
        x < f.x + 2 &&
        x + 2 > f.x &&
        y < f.y + 2 &&
        y + 2 > f.y,
    )
  );
}
export function adjacent(a: Facility, b: Facility) {
  return (
    ((a.x + 2 === b.x || b.x + 2 === a.x) && a.y < b.y + 2 && a.y + 2 > b.y) ||
    ((a.y + 2 === b.y || b.y + 2 === a.y) && a.x < b.x + 2 && a.x + 2 > b.x)
  );
}
const has = (s: GameData, role: string) => s.staff.some((p) => p.role === role);
const hasPair = (s: GameData, a: FacilityKind, b: FacilityKind) =>
  s.facilities.some(
    (f) =>
      f.kind === a && s.facilities.some((g) => g.kind === b && adjacent(f, g)),
  );
const available = (s: GameData, kind: FacilityKind) =>
  s.facilities.find(
    (f) =>
      f.kind === kind && !s.streamers.some((c) => c.job?.facilityId === f.id),
  );
export function streamBlock(
  s: GameData,
  c: Streamer,
  style: Style,
  partnerId?: string,
): string | null {
  if (c.job) return "このライバーは活動中です。完了を待ちましょう。";
  if (c.fatigue >= 100) return "疲労100です。先に休養しましょう。";
  if (!available(s, "booth")) return "空いている配信ブースがありません。";
  if (style === "COLLAB") {
    if (s.agencyLevel < 7) return "コラボは事務所Lv7で解放されます。";
    const p = s.streamers.find((x) => x.id === partnerId && x.id !== c.id);
    if (!p || p.job || p.fatigue >= 90)
      return "活動していない元気なコラボ相手を選んでください。";
  }
  return null;
}
function startStream(
  s: GameData,
  c: Streamer,
  style: Style,
  partnerId?: string,
  force = false,
) {
  const block = streamBlock(s, c, style, partnerId);
  if (block) {
    log(s, block);
    return;
  }
  if (c.fatigue >= 90 && !force) {
    log(s, "疲労90以上です。休憩をおすすめします。");
    return;
  }
  const f = available(s, "booth")!;
  const duration = style === "ENDURANCE" ? 20 : 12;
  c.job = {
    type: "STREAMING",
    remaining: duration,
    total: duration,
    facilityId: f.id,
    style,
    ...(partnerId ? { partnerId } : {}),
  };
  if (partnerId) {
    const p = s.streamers.find((x) => x.id === partnerId)!;
    p.job = {
      type: "STREAMING",
      remaining: duration,
      total: duration,
      facilityId: f.id,
      partnerId: c.id,
    };
  }
  log(s, `${c.name}が${STYLES[style].name}配信を開始しました。`);
}
export function calculateStream(
  s: GameData,
  c: Streamer,
  style: Style,
  facilityId: string,
  partnerId?: string,
): StreamResult {
  const p = s.streamers.find((x) => x.id === partnerId);
  const main =
    style === "SING"
      ? c.stats.sing
      : style === "PROJECT"
        ? c.stats.project
        : style === "ENDURANCE"
          ? (c.stats.endurance + c.stats.mental) / 2
          : style === "COLLAB"
            ? (c.stats.talk + c.stats.fanService + (p ? p.stats.talk : 50)) / 3
            : c.stats.talk;
  const f = s.facilities.find((x) => x.id === facilityId);
  const facilityMultiplier = 1 + (Math.max(1, f?.level ?? 1) - 1) * 0.5;
  let trait = 1;
  if (c.id === "luna" && style === "SING") trait *= 1.2;
  if (c.id === "rei" && style === "TALK") trait *= 1.3;
  if (c.id === "shion" && style === "PROJECT") trait *= 1.35;
  if (c.id === "yui" && style === "COLLAB") trait *= 1.25;
  if (c.id === "akane" && s.event.joined) trait *= 1.2;
  const rng = c.id === "ren" ? 0.7 + random(s) * 0.8 : 0.9 + random(s) * 0.25;
  const fanService = c.stats.fanService * 0.6 * (c.id === "mina" ? 1.25 : 1);
  const performance =
    main * 1.3 +
    fanService +
    c.stats.popularity * 0.5 +
    c.mood * 0.4 +
    c.level * 1.5;
  let final =
    Math.max(1, performance - Math.max(0, c.fatigue - 50) * 0.8) *
    SLOTS[Math.min(4, Math.floor(s.seconds / 9))].mult *
    trait *
    facilityMultiplier *
    rng;
  let accidentRate =
    0.02 +
    (c.fatigue > 80 ? 0.12 : 0) +
    (c.stats.mental < 40 ? 0.05 : 0) +
    (c.mood < 30 ? 0.06 : 0) +
    (c.id === "rei" && c.fatigue >= 80 ? 0.1 : 0) -
    (has(s, "MANAGER") ? 0.01 : 0);
  if (style === "PROJECT" && hasPair(s, "talk", "project")) accidentRate *= 0.9;
  const accident = random(s) < accidentRate;
  if (accident) final *= 0.35;
  const viral =
    !accident &&
    random(s) <
      Math.min(0.15, 0.05 + Math.max(0, c.stats.project - 60) * 0.0015);
  let fanBonus =
    (c.id === "hiyori" ? 1.15 : 1) *
    (has(s, "PROMOTER") ? 1.15 : 1) *
    (style === "SING" && hasPair(s, "sing", "studio") ? 1.15 : 1);
  if (c.mood <= 20) fanBonus *= 0.75;
  const fans = Math.max(
    1,
    Math.floor(
      final *
        STYLES[style].mult *
        (1 + Math.log10(c.fanCount + 10) * 0.08) *
        0.8 *
        fanBonus *
        (viral ? 2 : 1),
    ),
  );
  const rank = RANKS[c.rankIndex][0];
  const rm =
    rank === "S"
      ? 2
      : rank === "A"
        ? 1.5
        : rank === "B"
          ? 1.2
          : rank === "C"
            ? 1
            : 0.8;
  const nearManager =
    f && s.facilities.some((g) => g.kind === "manager" && adjacent(f, g));
  const revenue = Math.floor(
    fans * 18 * rm * (viral ? 1.5 : 1) * (nearManager ? 1.1 : 1),
  );
  return {
    id: `${absoluteDay(s)}-${s.stats.streams}-${c.id}`,
    streamerId: c.id,
    name: c.name,
    day: s.day,
    month: s.month,
    style,
    fans,
    revenue,
    exp: Math.max(15, Math.floor(final * 0.25)),
    viewers: Math.floor(final * (1 + Math.log10(c.fanCount + 10)) * 0.6),
    viral,
    accident,
    rankUp: null,
  };
}
function completeStream(s: GameData, c: Streamer) {
  const j = c.job!;
  const result = calculateStream(s, c, j.style!, j.facilityId, j.partnerId);
  const oldRank = c.rankIndex;
  c.rankPoints += result.accident
    ? -2
    : result.fans >= 250
      ? 2
      : result.fans >= 100
        ? 1
        : result.fans >= 60
          ? 0
          : -1;
  if (c.rankPoints >= 6 && c.rankIndex < RANKS.length - 1) {
    c.rankPoints -= 6;
    c.rankIndex++;
  } else if (c.rankPoints <= -4 && c.rankIndex > 0) {
    c.rankIndex--;
    c.rankPoints = 0;
  } else if (c.rankIndex === 0) c.rankPoints = Math.max(0, c.rankPoints);
  if (c.rankIndex === RANKS.length - 1)
    c.rankPoints = Math.min(6, c.rankPoints);
  if (c.rankIndex > oldRank) {
    result.rankUp = RANKS[c.rankIndex];
    c.memories.push(
      `${s.month}月${s.day}日、${result.rankUp}ランクへ。応援の声が力になった。`,
    );
  }
  c.fanCount += result.fans;
  c.exp += result.exp;
  while (c.exp >= c.level * 80) {
    c.exp -= c.level * 80;
    c.level++;
    for (const k of Object.keys(STATS) as Stat[])
      c.stats[k] = clamp(
        c.stats[k] + (c.id === "leaf" && c.level >= 10 ? 1.5 : 1),
      );
  }
  c.fatigue = clamp(
    c.fatigue +
      (j.style === "ENDURANCE" ? 32 : 22) *
        (c.id === "momo" ? 0.85 : 1) *
        (c.id === "noa" && j.style === "ENDURANCE" ? 0.7 : 1) *
        (has(s, "MANAGER") ? 0.85 : 1),
  );
  c.mood = clamp(c.mood + (result.accident ? -(c.id === "shion" ? 12 : 8) : 3));
  c.affection = clamp(c.affection + (result.accident ? 0 : 2));
  if (!c.history.length)
    c.memories.push("初配信。画面の向こうに、初めての「おかえり」が生まれた。");
  c.history.unshift(result);
  c.history = c.history.slice(0, CONFIG.historyLimit);
  c.memories = c.memories.slice(-20);
  if (j.partnerId) {
    const partner = s.streamers.find((p) => p.id === j.partnerId);
    if (partner) {
      partner.fanCount += Math.floor(result.fans * 0.4);
      s.monthlyFans += Math.floor(result.fans * 0.4);
      partner.fatigue = clamp(partner.fatigue + 18);
      partner.affection = clamp(partner.affection + 2);
      partner.job = null;
    }
  }
  income(s, result.revenue);
  s.monthlyRoyalty += Math.floor(result.revenue * 0.4);
  s.monthlyFans += result.fans;
  s.stats.streams++;
  s.requests.streams = Math.min(2, s.requests.streams + 1);
  if (j.style === requestTheme(s).style) s.requests.themed = 1;
  if (result.viral) s.stats.viral++;
  if (s.event.joined) {
    const fit = j.style === EVENTS[s.event.type].style ? 1.4 : 1;
    s.event.score += Math.floor(
      result.fans * fit * (has(s, "DESIGNER") ? 1.2 : 1),
    );
  }
  c.job = null;
  if (!c.auto) s.resultQueue.push(result);
  log(
    s,
    `${result.viral ? "🔥 " : ""}${c.name}の配信完了！ +${result.fans} FAN / +${result.revenue.toLocaleString()}G`,
  );
  agencyExp(s, 20 + Math.floor(result.fans / 30));
  s.tutorial = Math.max(2, s.tutorial);
}
function rest(s: GameData, c: Streamer) {
  if (c.job) {
    log(s, "活動が終わってから休憩できます。");
    return;
  }
  const f = available(s, "rest") ?? available(s, "cafe");
  if (!f) {
    log(s, "休憩スペースは使用中です。自然回復も毎日発生します。");
    return;
  }
  c.job = { type: "RESTING", remaining: 9, total: 9, facilityId: f.id };
}
function candidates(s: GameData) {
  const pool = CHARACTERS.filter(
    (c) => !s.streamers.some((x) => x.id === c.id),
  );
  const chosen: string[] = [];
  const quality =
    (has(s, "SCOUT") ? 1 : 0) +
    s.facilities
      .filter((f) => f.kind === "scout")
      .reduce((n, f) => n + f.level, 0) +
    (s.agencyLevel >= 20 ? 2 : 0);
  for (let i = 0; i < 3 && pool.length; i++) {
    const roll = random(s);
    const ssr = Math.min(0.1, 0.03 + quality * 0.015);
    const target =
      roll < ssr
        ? "SSR"
        : roll < ssr + 0.15 + quality * 0.015
          ? "SR"
          : roll < ssr + 0.47 + quality * 0.015
            ? "R"
            : "N";
    const matches = pool.filter((c) => c.rarity === target);
    const c = (matches.length ? matches : pool)[
      Math.floor(random(s) * (matches.length || pool.length))
    ];
    chosen.push(c.id);
    pool.splice(pool.indexOf(c), 1);
  }
  s.candidates = chosen;
}
function daily(s: GameData) {
  for (const c of s.streamers) {
    if (!c.job) {
      c.fatigue = clamp(c.fatigue - 8);
      c.mood = clamp(
        c.mood + 3 + (s.facilities.some((f) => f.kind === "reception") ? 2 : 0),
      );
    }
  }
  const goods = s.facilities
    .filter((f) => f.kind === "goods")
    .reduce((n, f) => n + f.level, 0);
  if (goods) income(s, Math.floor(totalFans(s) * 0.1 * goods));
  if (s.day % 4 === 0) {
    const e = Math.floor(random(s) * RANDOM_EVENTS.length);
    if (e % 5 === 2) s.choice = e;
    else {
      const c = s.streamers[Math.floor(random(s) * s.streamers.length)];
      if (c) {
        let effect = "";
        switch (e % 4) {
          case 0: {
            const bonus = 30 + Math.floor(random(s) * 120);
            c.fanCount += bonus;
            s.monthlyFans += bonus;
            effect = `+${bonus} FAN`;
            break;
          }
          case 1: {
            const bonus = 1500 + Math.floor(random(s) * 3500);
            income(s, bonus);
            effect = `臨時収入 +${bonus.toLocaleString()}G`;
            break;
          }
          case 2:
            c.fatigue = clamp(c.fatigue - 15);
            c.mood = clamp(c.mood + 8);
            effect = "疲労 −15 / Mood +8";
            break;
          case 3: {
            const stat = (Object.keys(STATS) as Stat[])[
              Math.floor(random(s) * 7)
            ];
            c.stats[stat] = clamp(c.stats[stat] + 1);
            effect = `${STATS[stat]} +1`;
            break;
          }
        }
        c.affection = clamp(c.affection + 1);
        log(s, `${RANDOM_EVENTS[e]}！ ${c.name}：${effect}`);
      }
    }
  }
}
function monthEnd(s: GameData) {
  if (s.event.joined) {
    const scores = NPCS.map((name, i) => ({
      name,
      score: Math.floor(
        (2200 + i * 1000) *
          (s.event.large ? 1.8 : 1) *
          (1 + s.month * 0.08) *
          (0.8 + random(s) * 0.4),
      ),
    }));
    const rank = 1 + scores.filter((x) => x.score > s.event.score).length;
    const reward =
      (rank === 1
        ? 300000
        : rank === 2
          ? 200000
          : rank === 3
            ? 120000
            : 50000) * (s.event.large ? 2 : 1);
    income(s, reward);
    s.event.lastResult = `${s.event.large ? "大型 " : ""}${EVENTS[s.event.type].name} ${rank}位 / +${reward.toLocaleString()}G`;
    if (rank === 1) s.event.wins++;
    log(s, s.event.lastResult);
    agencyExp(s, 120);
  }
  const upkeep =
    s.staff.reduce((n, p) => n + p.salary, 0) +
    15000 +
    s.facilities.length * 1500;
  pay(s, upkeep + s.monthlyRoyalty);
  const profit = s.monthlyIncome - s.monthlyExpense;
  const report = {
    month: s.month,
    income: s.monthlyIncome,
    expense: s.monthlyExpense,
    profit,
    fans: s.monthlyFans,
    comparison: profit - (s.reports[0]?.profit ?? 0),
    ranking: s.streamers
      .map((c) => ({ name: c.name, fans: c.fanCount }))
      .sort((a, b) => b.fans - a.fans),
    event: s.event.joined
      ? s.event.lastResult
      : "今月はイベントに参加していません",
  };
  s.reports.unshift(report);
  s.reports = s.reports.slice(0, 12);
  s.reportPending = true;
  s.stats.maxMonthly = Math.max(s.stats.maxMonthly, s.monthlyIncome);
  s.stats.months++;
  if (s.money < 0) s.crisisMonths++;
  else if (profit >= 0) s.crisisMonths = 0;
  if (s.crisisMonths >= 3) s.gameOver = true;
  if (profit > 0) agencyExp(s, 100);
  log(
    s,
    `${s.month}月の決算：${profit >= 0 ? "黒字" : "赤字"} ${profit.toLocaleString()}G`,
  );
  s.month++;
  s.day = 1;
  s.monthlyIncome = 0;
  s.monthlyExpense = 0;
  s.monthlyRoyalty = 0;
  s.monthlyFans = 0;
  s.event.joined = false;
  s.event.large = false;
  s.event.score = 0;
  s.event.type = (s.month - 1) % EVENTS.length;
}
export function achievementReady(s: GameData, id: string): boolean {
  const fans = totalFans(s);
  const tests: Record<string, boolean> = {
    stream: s.stats.streams >= 1,
    scout: s.stats.scouts >= 1,
    build: s.stats.builds >= 1,
    train: s.stats.training >= 1,
    fans100: fans >= 100,
    fans1k: fans >= 1000,
    fans10k: fans >= 10000,
    fans100k: fans >= 100000,
    team5: s.streamers.length >= 5,
    team10: s.streamers.length >= 10,
    team15: s.streamers.length >= 15,
    level5: s.agencyLevel >= 5,
    level10: s.agencyLevel >= 10,
    level20: s.agencyLevel >= 20,
    level30: s.agencyLevel >= 30,
    event: s.event.entries >= 1,
    win: s.event.wins >= 1,
    s: s.streamers.some((c) => c.rankIndex >= 12),
    million: s.stats.maxMonthly >= 1000000 || s.monthlyIncome >= 1000000,
    all: FACILITIES.every((f) => s.facilities.some((p) => p.kind === f.kind)),
    viral: s.stats.viral > 0,
    love: s.streamers.some((c) => c.affection >= 100),
    month: s.stats.months > 0,
    streams100: s.stats.streams >= 100,
  };
  return tests[id] ?? false;
}
export function reduceGame(state: GameData, a: Action): GameData {
  const s = structuredClone(state);
  if (s.gameOver && !["REPORT_CLOSE", "SETTINGS"].includes(a.type)) return s;
  const c = "id" in a ? s.streamers.find((p) => p.id === a.id) : undefined;
  switch (a.type) {
    case "REQUEST_CLAIM": {
      if (!s.started || a.round !== s.requests.round) break;
      const goal = requestGoals(s).find((g) => g.id === a.id);
      if (
        !goal ||
        goal.value < goal.target ||
        s.requests.claimed.includes(a.id)
      )
        break;
      s.requests.claimed.push(a.id);
      income(s, goal.reward);
      agencyExp(s, 10);
      log(s, `お願い「${goal.title}」達成！ +${goal.reward.toLocaleString()}G`);
      if (s.requests.claimed.length === 3)
        log(s, `ファンからのお便り：${requestTheme(s).letter}`);
      break;
    }
    case "REQUEST_NEXT":
      if (
        s.started &&
        a.round === s.requests.round &&
        s.requests.claimed.length === 3
      ) {
        s.requests = newRequests(s.requests.round + 1);
        log(s, `新しいファンのお願いが届きました：${requestTheme(s).title}`);
      }
      break;
    case "START": {
      if (s.started) return s;
      const d = CHARACTERS.find(
        (p) => STARTER_IDS.includes(p.id) && p.id === a.id,
      );
      if (!d) return s;
      s.streamers = [createStreamer(d)];
      s.started = true;
      s.tutorial = 1;
      log(s, `${d.name}と、今日から事務所ものがたりが始まります。`);
      break;
    }
    case "TICK": {
      if (
        !s.started ||
        s.resultQueue.length ||
        s.reportPending ||
        s.choice !== null ||
        s.levelNotice
      )
        return s;
      let delta = clamp(a.delta, 0, 4);
      s.seconds += delta;
      for (const person of s.streamers) {
        if (person.job) {
          person.job.remaining -= delta;
          if (person.job.remaining <= 0) {
            const j = person.job;
            if (j.type === "STREAMING" && j.style) completeStream(s, person);
            else if (j.type === "TRAINING") {
              const f = s.facilities.find((p) => p.id === j.facilityId);
              const growth = Math.min(
                5,
                Math.round(
                  (1 +
                    Math.floor(random(s) * 3) +
                    (has(s, "TRAINER") ? 1 : 0) +
                    ((f?.level ?? 1) - 1)) *
                    (person.id === "ao" ? 1.25 : 1),
                ),
              );
              person.stats[j.stat!] = clamp(person.stats[j.stat!] + growth);
              person.fatigue = clamp(person.fatigue + 12);
              person.affection = clamp(person.affection + 1);
              s.stats.training++;
              person.job = null;
              log(s, `${person.name}の${STATS[j.stat!]} +${growth}！`);
              agencyExp(s, 8);
            } else if (j.type === "RESTING") {
              if (person.fatigue > 0) s.requests.rests = 1;
              const f = s.facilities.find((p) => p.id === j.facilityId);
              person.fatigue = clamp(
                person.fatigue -
                  40 *
                    (1 + ((f?.level ?? 1) - 1) * 0.5) *
                    (hasPair(s, "rest", "cafe") ? 1.2 : 1),
              );
              person.mood = clamp(
                person.mood +
                  15 +
                  (s.facilities.some((p) => p.kind === "cafe") ? 10 : 0),
              );
              person.job = null;
            }
          }
        }
        if (person.auto && !person.job) {
          if (person.fatigue >= 40 || person.mood <= 30) rest(s, person);
          else if (
            person.lastAutoDay !== absoluteDay(s) &&
            available(s, "booth")
          ) {
            const style =
              person.preferredStyle === "COLLAB"
                ? "TALK"
                : person.preferredStyle;
            startStream(s, person, style);
            if (person.job) person.lastAutoDay = absoluteDay(s);
          }
        }
      }
      if (s.seconds >= 45) {
        s.seconds -= 45;
        s.day++;
        if (s.day > 30) monthEnd(s);
        daily(s);
      }
      break;
    }
    case "STREAM":
      if (c) startStream(s, c, a.style, a.partnerId, a.force);
      break;
    case "REST":
      if (c) rest(s, c);
      break;
    case "AUTO":
      if (c) c.auto = !c.auto;
      break;
    case "TRAIN": {
      if (!c) break;
      if (c.job) {
        log(s, "活動中はレッスンできません。");
        break;
      }
      if (s.agencyLevel < 3) {
        log(s, "レッスンは事務所Lv3で解放されます。");
        break;
      }
      if (c.stats[a.stat] >= 100) {
        log(s, "この能力は最大です。");
        break;
      }
      if (c.fatigue >= 90) {
        log(s, "疲れているので先に休憩しましょう。");
        break;
      }
      const kind =
        a.stat === "sing"
          ? "sing"
          : a.stat === "talk"
            ? "talk"
            : a.stat === "project"
              ? "project"
              : "desk";
      const f = available(s, kind);
      if (!f) {
        log(s, "対応するレッスン施設がないか、使用中です。");
        break;
      }
      if (!affordable(s, 5000)) break;
      pay(s, 5000);
      c.job = {
        type: "TRAINING",
        remaining: 9,
        total: 9,
        facilityId: f.id,
        stat: a.stat,
      };
      break;
    }
    case "SCOUT": {
      if (s.streamers.length >= capacity(s.agencyLevel)) {
        log(s, "所属人数が上限です。事務所レベルを上げましょう。");
        break;
      }
      if (
        s.streamers.some((c) => c.id === a.id) ||
        !s.candidates.includes(a.id)
      )
        break;
      const d = CHARACTERS.find((c) => c.id === a.id);
      if (!d || !affordable(s, PRICES[d.rarity])) break;
      pay(s, PRICES[d.rarity]);
      s.streamers.push(createStreamer(d));
      s.candidates = s.candidates.filter((id) => id !== a.id);
      s.stats.scouts++;
      s.tutorial = Math.max(3, s.tutorial);
      agencyExp(s, 20);
      log(s, `${d.name}が仲間になりました！`);
      break;
    }
    case "REFRESH": {
      const free = absoluteDay(s) >= s.freeRefreshDay;
      if (!free && !affordable(s, 5000)) break;
      if (free) s.freeRefreshDay = absoluteDay(s) + 7;
      else pay(s, 5000);
      candidates(s);
      log(s, "新しいスカウト候補が届きました。");
      break;
    }
    case "BUILD": {
      const d = FACILITIES.find((f) => f.kind === a.kind)!;
      if (s.agencyLevel < d.unlock) {
        log(s, `事務所Lv${d.unlock}で解放されます。`);
        break;
      }
      if (!canPlace(s, a.x, a.y)) {
        log(s, "ここには配置できません。空いた2×2マスを選んでください。");
        break;
      }
      if (!affordable(s, d.price)) break;
      pay(s, d.price);
      s.facilities.push({
        id: `f${s.seed}-${s.stats.builds}`,
        kind: a.kind,
        x: a.x,
        y: a.y,
        level: 1,
      });
      random(s);
      s.stats.builds++;
      s.tutorial = 4;
      agencyExp(s, 15);
      log(s, `${d.name}を建設しました！`);
      break;
    }
    case "UPGRADE": {
      const f = s.facilities.find((f) => f.id === a.id);
      if (!f || f.level >= 3) break;
      const cost = Math.floor(
        FACILITIES.find((d) => d.kind === f.kind)!.price *
          Math.pow(1.7, f.level),
      );
      if (!affordable(s, cost)) break;
      pay(s, cost);
      f.level++;
      agencyExp(s, 15);
      log(
        s,
        `${FACILITIES.find((d) => d.kind === f.kind)!.name}がLv${f.level}に！`,
      );
      break;
    }
    case "HIRE": {
      if (s.agencyLevel < 2) {
        log(s, "スタッフは事務所Lv2で解放されます。");
        break;
      }
      if (s.staff.length >= staffCapacity(s.agencyLevel)) {
        log(s, "スタッフ人数が上限です。");
        break;
      }
      if (s.staff.some((p) => p.role === a.role)) {
        log(s, "この役割のスタッフは採用済みです。");
        break;
      }
      const d = ROLES[a.role];
      if (!affordable(s, d.salary)) break;
      pay(s, d.salary);
      s.staff.push({
        id: `staff-${a.role}`,
        name: ["佐藤", "高橋", "青木", "橘", "小林"][
          Object.keys(ROLES).indexOf(a.role)
        ],
        role: a.role,
        level: 1,
        salary: d.salary,
        bonusValue: 0.15,
      });
      log(s, `${d.name}を採用しました。毎月末に給与が発生します。`);
      break;
    }
    case "EVENT": {
      if (s.agencyLevel < 5) {
        log(s, "イベントは事務所Lv5で解放されます。");
        break;
      }
      if (s.event.joined) break;
      s.event.joined = true;
      s.event.large = s.agencyLevel >= 25;
      s.event.entries++;
      log(
        s,
        `${EVENTS[s.event.type].name}にエントリー！ 月末までの配信が得点になります。`,
      );
      break;
    }
    case "CHOICE": {
      if (s.choice === null) break;
      if (a.paid) {
        if (!affordable(s, 8000)) break;
        pay(s, 8000);
        for (const p of s.streamers) {
          p.mood = clamp(p.mood + 15);
          p.affection = clamp(p.affection + 3);
        }
        agencyExp(s, 20);
        log(s, "みんなで取り組んで、事務所の絆が深まりました。");
      } else {
        for (const p of s.streamers) p.mood = clamp(p.mood + 3);
        log(s, "今回は、いつものペースを大切にしました。");
      }
      s.choice = null;
      break;
    }
    case "CLAIM": {
      const ach = ACHIEVEMENTS.find((p) => p[0] === a.id);
      if (!ach || s.achievements.includes(a.id) || !achievementReady(s, a.id))
        break;
      s.achievements.push(a.id);
      income(s, ach[3]);
      agencyExp(s, 15);
      log(s, `実績「${ach[1]}」を達成！ +${ach[3].toLocaleString()}G`);
      break;
    }
    case "CONTRACT": {
      if (s.agencyLevel < 15 || s.stats.contracts >= s.month) {
        log(s, "案件はLv15から月1回受けられます。");
        break;
      }
      const reward = Math.floor(
        (30000 + totalFans(s) * 0.2) * (has(s, "DESIGNER") ? 1.2 : 1),
      );
      income(s, reward);
      s.stats.contracts = s.month;
      log(s, `広告案件が完成！ +${reward.toLocaleString()}G`);
      agencyExp(s, 80);
      break;
    }
    case "RESULT_CLOSE":
      s.resultQueue.shift();
      break;
    case "REPORT_CLOSE":
      s.reportPending = false;
      break;
    case "LEVEL_CLOSE":
      s.levelNotice = null;
      break;
    case "CUSTOMIZE": {
      const c = s.streamers.find((p) => p.id === a.id);
      if (!c || !canCustomize(c) || !validCustomization(a.customization)) break;
      c.customization = { ...a.customization, unlocked: true };
      c.name =
        c.customization.displayName ??
        CHARACTERS.find((d) => d.id === c.id)!.name;
      log(s, `${c.name}の「私だけの推し」設定を保存しました。`);
      break;
    }
    case "SETTINGS":
      s.settings[a.key] = a.value;
      break;
  }
  for (const c of s.streamers) {
    if (canCustomize(c) && !c.customization.unlocked) {
      c.customization.unlocked = true;
      c.memories.push(
        `${s.month}月${s.day}日、絆が深まり「私だけの推し」が解放された。`,
      );
      c.memories = c.memories.slice(-20);
      log(s, `${c.name}との絆が深まりました！ 私だけの推し設定が解放。`);
    }
  }
  return s;
}
