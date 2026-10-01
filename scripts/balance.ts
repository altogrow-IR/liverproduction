import { CHARACTERS } from "../src/game/data.ts";
import {
  createStreamer,
  initialState,
  reduceGame,
} from "../src/game/engine.ts";
import type { GameData } from "../src/types.ts";

// Steady-state fixtures: operating results, excluding one-time capital expenditure.
for (const scenario of [
  { people: 2, level: 1, rank: 0, booth: 1 },
  { people: 8, level: 10, rank: 6, booth: 2 },
  { people: 20, level: 30, rank: 12, booth: 3 },
]) {
  let s = initialState(20260910);
  s.started = true;
  s.agencyLevel = scenario.level;
  s.mapSize = scenario.level === 1 ? 8 : scenario.level === 10 ? 12 : 16;
  s.money = 300000;
  s.streamers = CHARACTERS.slice(0, scenario.people).map((c) => ({
    ...createStreamer(c),
    auto: true,
    rankIndex: scenario.rank,
    level: scenario.level,
    fanCount: scenario.level === 1 ? 0 : scenario.level * 2000,
  }));
  const columns = Math.floor(s.mapSize / 3);
  s.facilities = Array.from(
    { length: scenario.people + Math.ceil(scenario.people / 4) },
    (_, i) => ({
      id: `b${i}`,
      kind: i < scenario.people ? "booth" : "rest",
      x: Math.floor(i / columns) * 3,
      y: (i % columns) * 3,
      level: i < scenario.people ? scenario.booth : 1,
    }),
  ) as GameData["facilities"];
  for (let i = 0; i < 1350; i++) {
    s.levelNotice = null;
    s.resultQueue = [];
    s.choice = null;
    s.reportPending = false;
    s = reduceGame(s, { type: "TICK", delta: 1 });
  }
  const report = s.reports[0];
  console.log(
    JSON.stringify({
      people: scenario.people,
      startLevel: scenario.level,
      monthIncome: report.income,
      monthExpense: report.expense,
      profit: report.profit,
      streams: s.stats.streams,
      fansGained: report.fans,
      endLevel: s.agencyLevel,
    }),
  );
}
