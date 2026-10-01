import test from "node:test";
import assert from "node:assert/strict";
import {
  absoluteDay,
  achievementReady,
  adjacent,
  agencyExp,
  calculateStream,
  canPlace,
  createStreamer,
  initialState,
  reduceGame,
  totalFans,
} from "../src/game/engine.ts";
import {
  CHARACTERS,
  FACILITIES,
  capacity,
  mapSize,
  neededExp,
} from "../src/game/data.ts";
import { decodeSave } from "../src/game/storage.ts";
import { route, updateActors } from "../src/game/canvas/renderOffice.ts";
import type { Actor } from "../src/game/canvas/renderOffice.ts";
import type { GameData } from "../src/types.ts";
function start(seed = 123) {
  return reduceGame(initialState(seed), { type: "START", id: "hiyori" });
}
function dismiss(s: GameData) {
  s.resultQueue = [];
  s.levelNotice = null;
  s.reportPending = false;
  s.choice = null;
  return s;
}
function tick(s: GameData, seconds: number) {
  for (let t = 0; t < seconds; t++)
    s = reduceGame(dismiss(s), { type: "TICK", delta: 1 });
  return s;
}
test("initial choice preserves exact stats and starting office", () => {
  for (const id of ["hiyori", "luna", "akane"]) {
    const s = reduceGame(initialState(), { type: "START", id });
    assert.equal(s.money, 300000);
    assert.equal(s.mapSize, 8);
    assert.equal(s.facilities.length, 3);
    assert.equal(s.streamers[0].id, id);
  }
  assert.equal(CHARACTERS.length, 24);
  assert.equal(start().streamers[0].stats.talk, 72);
});
test("stream completion yields fans, money, experience and history", () => {
  let s = start();
  s = reduceGame(s, { type: "STREAM", id: "hiyori", style: "TALK" });
  assert.equal(s.streamers[0].job?.type, "STREAMING");
  s = tick(s, 12);
  assert.equal(s.stats.streams, 1);
  assert.ok(s.streamers[0].fanCount > 0);
  assert.ok(s.money > 300000);
  assert.ok(s.streamers[0].fatigue > 0);
  assert.equal(s.streamers[0].history.length, 1);
  assert.ok(s.agencyExp > 0);
  assert.ok(achievementReady(s, "stream"));
});
test("busy booth and double commands cannot overlap", () => {
  let s = start();
  s = reduceGame(s, { type: "SCOUT", id: "momo" });
  s = reduceGame(s, { type: "STREAM", id: "hiyori", style: "TALK" });
  const before = structuredClone(s.streamers[0].job);
  s = reduceGame(s, { type: "STREAM", id: "hiyori", style: "SING" });
  assert.deepEqual(s.streamers[0].job, before);
  s = reduceGame(s, { type: "STREAM", id: "momo", style: "TALK" });
  assert.equal(s.streamers[1].job, null);
});
test("fatigue 100 blocks streaming, rest restores within limits", () => {
  let s = start();
  s.streamers[0].fatigue = 100;
  s.streamers[0].mood = 0;
  s = reduceGame(s, {
    type: "STREAM",
    id: "hiyori",
    style: "TALK",
    force: true,
  });
  assert.equal(s.streamers[0].job, null);
  s = reduceGame(s, { type: "REST", id: "hiyori" });
  s = tick(s, 9);
  assert.equal(s.streamers[0].fatigue, 60);
  assert.equal(s.streamers[0].mood, 15);
});
test("fatigue 90 requires explicit warning confirmation", () => {
  let s = start();
  s.streamers[0].fatigue = 90;
  s = reduceGame(s, { type: "STREAM", id: "hiyori", style: "TALK" });
  assert.equal(s.streamers[0].job, null);
  s = reduceGame(s, {
    type: "STREAM",
    id: "hiyori",
    style: "TALK",
    force: true,
  });
  assert.ok(s.streamers[0].job);
});
test("scout prevents overspending, duplicates and exceeding capacity", () => {
  let s = start();
  s.money = 0;
  let n = reduceGame(s, { type: "SCOUT", id: "momo" });
  assert.equal(n.streamers.length, 1);
  s.money = 300000;
  s = reduceGame(s, { type: "SCOUT", id: "momo" });
  assert.equal(s.money, 285000);
  s = reduceGame(s, { type: "SCOUT", id: "momo" });
  assert.equal(s.money, 285000);
  s = reduceGame(s, { type: "SCOUT", id: "ao" });
  s = reduceGame(s, { type: "SCOUT", id: "noa" });
  assert.equal(s.streamers.length, 3);
});
test("refresh free allowance uses absolute days across month boundary", () => {
  let s = start();
  s = reduceGame(s, { type: "REFRESH" });
  assert.equal(s.money, 300000);
  assert.equal(s.freeRefreshDay, 8);
  s = reduceGame(s, { type: "REFRESH" });
  assert.equal(s.money, 295000);
  s.month = 2;
  s.day = 1;
  assert.equal(absoluteDay(s), 31);
  s = reduceGame(s, { type: "REFRESH" });
  assert.equal(s.money, 295000);
  assert.equal(s.freeRefreshDay, 38);
  assert.equal(new Set(s.candidates).size, s.candidates.length);
});
test("build validates borders, occupancy, unlock and upgrades cap", () => {
  let s = start();
  assert.equal(canPlace(s, 7, 7), false);
  assert.equal(canPlace(s, 1, 1), false);
  assert.equal(canPlace(s, -1, 3), false);
  assert.equal(canPlace(s, 5, 5), true);
  s = reduceGame(s, { type: "BUILD", kind: "booth", x: 5, y: 5 });
  assert.equal(s.facilities.length, 4);
  assert.equal(s.money, 260000);
  s = reduceGame(s, { type: "BUILD", kind: "booth", x: 5, y: 5 });
  assert.equal(s.money, 260000);
  s = reduceGame(s, { type: "BUILD", kind: "studio", x: 3, y: 3 });
  assert.equal(s.facilities.length, 4);
  s.money = 1000000;
  for (let i = 0; i < 5; i++) s = reduceGame(s, { type: "UPGRADE", id: "f1" });
  assert.equal(s.facilities[0].level, 3);
});
test("adjacency uses touching edges and rejects diagonal contact", () => {
  const f = start().facilities[0];
  assert.ok(adjacent(f, { ...f, x: 3 }));
  assert.ok(!adjacent(f, { ...f, x: 3, y: 3 }));
  assert.ok(!adjacent(f, { ...f, x: 5 }));
});
test("training requires facility and level, caps ability at 100", () => {
  let s = start();
  s = reduceGame(s, { type: "TRAIN", id: "hiyori", stat: "talk" });
  assert.equal(s.streamers[0].job, null);
  s.agencyLevel = 3;
  s = reduceGame(s, { type: "BUILD", kind: "talk", x: 5, y: 5 });
  s.streamers[0].stats.talk = 99;
  const before = s.money;
  s = reduceGame(s, { type: "TRAIN", id: "hiyori", stat: "talk" });
  assert.equal(s.money, before - 5000);
  s = tick(s, 9);
  assert.equal(s.streamers[0].stats.talk, 100);
  assert.equal(s.stats.training, 1);
});
test("staff hire checks unlock, capacity and charges monthly salary", () => {
  let s = start();
  s = reduceGame(s, { type: "HIRE", role: "MANAGER" });
  assert.equal(s.staff.length, 0);
  s.agencyLevel = 2;
  s = reduceGame(s, { type: "HIRE", role: "MANAGER" });
  assert.equal(s.staff.length, 1);
  assert.equal(s.money, 270000);
  s = reduceGame(s, { type: "HIRE", role: "SCOUT" });
  assert.equal(s.staff.length, 1);
  s.day = 30;
  s.seconds = 44;
  s = reduceGame(dismiss(s), { type: "TICK", delta: 1 });
  assert.equal(s.month, 2);
  assert.equal(s.money, 220500);
  assert.equal(s.reports[0].expense, 79500);
});
test("event scores streams and pays ranked monthly reward", () => {
  let s = start();
  s.agencyLevel = 5;
  s.mapSize = 10;
  s = reduceGame(s, { type: "EVENT" });
  assert.equal(s.event.entries, 1);
  s = reduceGame(s, { type: "STREAM", id: "hiyori", style: "TALK" });
  s = tick(s, 12);
  assert.ok(s.event.score > 0);
  s.event.score = 999999;
  s.day = 30;
  s.seconds = 44;
  s = reduceGame(dismiss(s), { type: "TICK", delta: 1 });
  assert.equal(s.event.wins, 1);
  assert.match(s.event.lastResult, /1位/);
  assert.equal(s.event.joined, false);
});
test("crisis gives three monthly recovery opportunities, no immediate game over", () => {
  let s = start();
  s.money = -100;
  assert.equal(s.gameOver, false);
  for (let i = 0; i < 3; i++) {
    s.day = 30;
    s.seconds = 44;
    s = reduceGame(dismiss(s), { type: "TICK", delta: 1 });
    assert.equal(s.gameOver, i === 2);
  }
  assert.equal(s.crisisMonths, 3);
});
test("positive cash and profit recover a crisis", () => {
  let s = start();
  s.money = 100000;
  s.crisisMonths = 2;
  s.monthlyIncome = 90000;
  s.day = 30;
  s.seconds = 44;
  s = reduceGame(s, { type: "TICK", delta: 1 });
  assert.equal(s.crisisMonths, 0);
});
test("level progression expands map and capacity through level 30", () => {
  const s = start();
  agencyExp(s, 1000000);
  assert.equal(s.agencyLevel, 30);
  assert.equal(s.mapSize, 16);
  assert.equal(capacity(30), 20);
  assert.equal(s.milestone, true);
  assert.equal(mapSize(4), 10);
  assert.equal(neededExp(1), 100);
});
test("achievement rewards are claimable only once and only when earned", () => {
  let s = start();
  let before = s.money;
  s = reduceGame(s, { type: "CLAIM", id: "stream" });
  assert.equal(s.money, before);
  s.stats.streams = 1;
  s = reduceGame(s, { type: "CLAIM", id: "stream" });
  assert.equal(s.money, before + 10000);
  s = reduceGame(s, { type: "CLAIM", id: "stream" });
  assert.equal(s.money, before + 10000);
});
test("mood and fatigue extremes with large fans return finite outcomes", () => {
  for (const fatigue of [0, 100])
    for (const mood of [0, 100]) {
      const s = start();
      const c = s.streamers[0];
      c.fatigue = fatigue;
      c.mood = mood;
      c.fanCount = 1000000000;
      for (const stat of Object.keys(c.stats))
        c.stats[stat as keyof typeof c.stats] = 100;
      const result = calculateStream(s, c, "ENDURANCE", "f1");
      assert.ok(Number.isFinite(result.revenue));
      assert.ok(result.fans >= 1);
    }
});
test("collaboration requires available partner and completes both actors", () => {
  let s = start();
  s.agencyLevel = 7;
  s.mapSize = 10;
  s = reduceGame(s, { type: "SCOUT", id: "momo" });
  s = reduceGame(s, { type: "STREAM", id: "hiyori", style: "COLLAB" });
  assert.equal(s.streamers[0].job, null);
  s = reduceGame(s, {
    type: "STREAM",
    id: "hiyori",
    style: "COLLAB",
    partnerId: "momo",
  });
  assert.ok(s.streamers.every((c) => c.job));
  s = tick(s, 12);
  assert.ok(s.streamers.every((c) => c.job === null));
  assert.ok(s.streamers.every((c) => c.fanCount > 0));
});
test("30-day automatic play earns money, rests and advances calendar", () => {
  let s = start();
  s = reduceGame(s, { type: "AUTO", id: "hiyori" });
  s = tick(s, 1350);
  assert.equal(s.month, 2);
  assert.ok(s.stats.streams >= 25);
  assert.ok(s.money > 300000);
  assert.ok(s.streamers[0].fatigue < 90);
  assert.ok(totalFans(s) > 1000);
  assert.ok(s.agencyLevel >= 3);
});
test("save roundtrip preserves active jobs and catches corrupt nested data", () => {
  let s = start();
  s = reduceGame(s, { type: "STREAM", id: "hiyori", style: "TALK" });
  assert.deepEqual(decodeSave(JSON.stringify(s)), s);
  assert.throws(() => decodeSave("{bad"));
  assert.throws(() => decodeSave(JSON.stringify({ ...s, version: 99 })));
  assert.throws(() => decodeSave(JSON.stringify({ ...s, settings: {} })));
  assert.throws(() => decodeSave(JSON.stringify({ ...s, reports: [{}] })));
  s.streamers[0].fatigue = 101;
  assert.throws(() => decodeSave(JSON.stringify(s)));
});
test("save roundtrip across a month and results is valid", () => {
  let s = start();
  s = reduceGame(s, { type: "AUTO", id: "hiyori" });
  s = tick(s, 1350);
  assert.deepEqual(decodeSave(JSON.stringify(s)), s);
});
test("office route avoids buildings and stays on map", () => {
  const s = start();
  const path = route(s, { x: 4, y: 7 }, { x: 0, y: 0 });
  assert.ok(path.length > 0);
  for (const p of path) {
    assert.ok(p.x >= 0 && p.x < 8 && p.y >= 0 && p.y < 8);
    assert.ok(
      !s.facilities.some(
        (f) => p.x >= f.x && p.x < f.x + 2 && p.y >= f.y && p.y < f.y + 2,
      ),
    );
  }
});
test("all facility and character data can support the late game", () => {
  assert.equal(FACILITIES.length, 12);
  const s = start();
  s.streamers = [...CHARACTERS.slice(0, 16), ...CHARACTERS.slice(20)].map(
    createStreamer,
  );
  s.agencyLevel = 30;
  s.mapSize = 16;
  assert.equal(s.streamers.length, capacity(30));
  assert.doesNotThrow(() => decodeSave(JSON.stringify(s)));
});

test("S1 rank remains saveable after further successful streams", () => {
  let s = start();
  s.streamers[0].rankIndex = 14;
  s.streamers[0].rankPoints = 6;
  s = reduceGame(s, { type: "STREAM", id: "hiyori", style: "TALK" });
  s = tick(s, 12);
  assert.ok(s.streamers[0].rankPoints <= 6);
  assert.doesNotThrow(() => decodeSave(JSON.stringify(s)));
});

test("level 25 unlocks a large event with doubled rewards", () => {
  let s = start();
  s.agencyLevel = 25;
  s.mapSize = 14;
  s = reduceGame(s, { type: "EVENT" });
  assert.equal(s.event.large, true);
  s.event.score = 999999;
  s.day = 30;
  s.seconds = 44;
  s = reduceGame(s, { type: "TICK", delta: 1 });
  assert.match(s.reports[0].event, /大型/);
  assert.match(s.reports[0].event, /600,000/);
});

test("monthly settlement includes stream royalties and resets the ledger", () => {
  let s = start();
  s = reduceGame(s, { type: "STREAM", id: "hiyori", style: "TALK" });
  s = tick(s, 12);
  const royalty = s.monthlyRoyalty;
  assert.equal(royalty, Math.floor(s.streamers[0].history[0].revenue * 0.4));
  s.day = 30;
  s.seconds = 44;
  s = reduceGame(dismiss(s), { type: "TICK", delta: 1 });
  assert.equal(s.reports[0].expense, 19500 + royalty);
  assert.equal(s.monthlyRoyalty, 0);
});

test("actors spawn on free tiles and disappear after a restored game removes them", () => {
  const s = start();
  s.streamers.push(createStreamer(CHARACTERS[5]));
  const actors: Actor[] = [];
  updateActors(s, actors, 0);
  assert.equal(actors.length, 2);
  assert.notDeepEqual(
    { x: actors[0].x, y: actors[0].y },
    { x: actors[1].x, y: actors[1].y },
  );
  for (const a of actors)
    assert.ok(
      !s.facilities.some(
        (f) => a.x >= f.x && a.x < f.x + 2 && a.y >= f.y && a.y < f.y + 2,
      ),
    );
  updateActors(initialState(), actors, 0);
  assert.equal(actors.length, 0);
});

test("requests count completed streams and recovery, grant each reward once, and rotate", () => {
  let s = start();
  const id = s.streamers[0].id;
  s = reduceGame(s, { type: "REQUEST_CLAIM", id: "streams", round: 1 });
  assert.equal(s.money, 300000);
  s = reduceGame(s, { type: "REST", id });
  s = tick(s, 9);
  assert.equal(s.requests.rests, 0, "resting without fatigue must not count");
  for (let i = 0; i < 2; i++) {
    s = tick(reduceGame(dismiss(s), { type: "STREAM", id, style: "TALK" }), 12);
  }
  assert.equal(s.requests.streams, 2);
  assert.equal(s.requests.themed, 1);
  s = tick(reduceGame(dismiss(s), { type: "REST", id }), 9);
  assert.equal(s.requests.rests, 1);
  const before = s.money;
  for (const goal of ["streams", "themed", "rests"]) {
    s = reduceGame(s, { type: "REQUEST_CLAIM", id: goal, round: 1 });
    s = reduceGame(s, { type: "REQUEST_CLAIM", id: goal, round: 1 });
  }
  assert.equal(s.money, before + 6500);
  assert.match(s.logs[0].text, /ファンからのお便り/);
  assert.deepEqual(decodeSave(JSON.stringify(s)).requests, s.requests);
  s = reduceGame(s, { type: "REQUEST_NEXT", round: 1 });
  s = reduceGame(s, { type: "REQUEST_NEXT", round: 1 });
  assert.equal(s.requests.round, 2);
  assert.equal(s.requests.streams, 0);
  s = tick(reduceGame(dismiss(s), { type: "STREAM", id, style: "TALK" }), 12);
  assert.equal(s.requests.themed, 0, "the second round asks for singing");
  s = tick(reduceGame(dismiss(s), { type: "STREAM", id, style: "SING" }), 12);
  assert.equal(s.requests.themed, 1);
  const unchanged = s.money;
  s = reduceGame(s, { type: "REQUEST_CLAIM", id: "themed", round: 1 });
  assert.equal(
    s.money,
    unchanged,
    "stale round actions cannot claim new rewards",
  );
});

test("old saves migrate requests without changing existing progress; malformed boards reject", () => {
  const s = start();
  s.stats.streams = 40;
  const legacy = JSON.parse(JSON.stringify(s));
  legacy.version = 1;
  delete legacy.streamers[0].customization;
  delete legacy.requests;
  const restored = decodeSave(JSON.stringify(legacy));
  assert.deepEqual(restored.requests, initialState().requests);
  assert.equal(restored.stats.streams, 40);
  assert.equal(restored.money, s.money);
  for (const bad of [
    null,
    {},
    { ...s.requests, round: 0 },
    { ...s.requests, themed: 0.5 },
    { ...s.requests, claimed: ["streams"] },
    { ...s.requests, streams: 2, claimed: ["streams", "streams"] },
  ]) {
    assert.throws(() => decodeSave(JSON.stringify({ ...s, requests: bad })));
  }
});
