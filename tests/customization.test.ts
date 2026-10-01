import test from "node:test";
import assert from "node:assert/strict";
import { CHARACTERS, capacity, STARTER_IDS } from "../src/game/data.ts";
import {
  createStreamer,
  initialState,
  reduceGame,
  calculateStream,
} from "../src/game/engine.ts";
import {
  emptyCustomization,
  nameLength,
  validName,
} from "../src/game/customization.ts";
import { decodeSave } from "../src/game/storage.ts";
const start = () =>
  reduceGame(initialState(12), { type: "START", id: "hiyori" });

test("bond 39 blocks customization, 40 unlocks permanently and logs once", () => {
  let s = start();
  s.streamers[0].affection = 39;
  const edit = { ...emptyCustomization(true), displayName: "私の推し" };
  s = reduceGame(s, { type: "CUSTOMIZE", id: "hiyori", customization: edit });
  assert.equal(s.streamers[0].name, "天音ひより");
  s.streamers[0].affection = 40;
  s = reduceGame(s, { type: "AUTO", id: "hiyori" });
  assert.equal(s.streamers[0].customization.unlocked, true);
  assert.equal(
    s.streamers[0].memories.filter((m) => m.includes("私だけの推し")).length,
    1,
  );
  s.streamers[0].affection = 0;
  s = reduceGame(s, { type: "CUSTOMIZE", id: "hiyori", customization: edit });
  assert.equal(s.streamers[0].name, "私の推し");
  assert.equal(
    s.streamers[0].memories.filter((m) => m.includes("私だけの推し")).length,
    1,
  );
  assert.equal(decodeSave(JSON.stringify(s)).streamers[0].name, "私の推し");
});

test("customization keeps identity, stats, funds and other members intact; resetting keeps unlock", () => {
  let s = start();
  s.streamers.push(createStreamer(CHARACTERS[5]));
  s.streamers[0].affection = 40;
  const original = structuredClone(s);
  s = reduceGame(s, {
    type: "CUSTOMIZE",
    id: "hiyori",
    customization: {
      ...emptyCustomization(true),
      displayName: "同じ名前",
      portraitId: "custom-a",
      miniId: "custom-b",
      miniMode: "figure",
    },
  });
  assert.deepEqual(s.streamers[0].stats, original.streamers[0].stats);
  assert.deepEqual(s.streamers[1], original.streamers[1]);
  assert.equal(s.money, original.money);
  assert.equal(s.streamers[0].id, "hiyori");
  s = reduceGame(s, {
    type: "CUSTOMIZE",
    id: "hiyori",
    customization: emptyCustomization(true),
  });
  assert.equal(s.streamers[0].name, "天音ひより");
  assert.equal(s.streamers[0].customization.unlocked, true);
});

test("emoji names use grapheme length; invalid names and media references are rejected", () => {
  assert.equal(nameLength("👨‍👩‍👧‍👦✨"), 2);
  assert.equal(validName("🌸".repeat(20)), true);
  for (const name of ["", " ", "a".repeat(21), "hello\nworld", "a\u202eb"])
    assert.equal(validName(name), false);
  const s = start();
  s.streamers[0].affection = 40;
  assert.throws(() =>
    decodeSave(
      JSON.stringify({
        ...s,
        streamers: [
          {
            ...s.streamers[0],
            customization: {
              ...emptyCustomization(true),
              portraitId: "https://bad",
            },
          },
        ],
      }),
    ),
  );
  const edited = reduceGame(s, {
    type: "CUSTOMIZE",
    id: "hiyori",
    customization: { ...emptyCustomization(true), displayName: "" },
  });
  assert.equal(edited.streamers[0].name, "天音ひより");
});

test("legacy version 1 migrates bond unlock, progress, requests and history identity", () => {
  const s = start();
  const c = s.streamers[0];
  c.affection = 40;
  c.fanCount = 123;
  c.history.push(calculateStream(s, c, "TALK", "f1"));
  s.resultQueue = [...c.history];
  const raw = JSON.parse(JSON.stringify(s));
  raw.version = 1;
  delete raw.streamers[0].customization;
  delete raw.streamers[0].history[0].streamerId;
  delete raw.resultQueue[0].streamerId;
  const migrated = decodeSave(JSON.stringify(raw));
  assert.equal(migrated.version, 2);
  assert.equal(migrated.money, s.money);
  assert.equal(migrated.streamers[0].fanCount, 123);
  assert.equal(migrated.streamers[0].customization.unlocked, true);
  assert.equal(migrated.resultQueue[0].streamerId, "hiyori");
  assert.equal(migrated.streamers[0].history[0].streamerId, "hiyori");
  assert.deepEqual(migrated.requests, s.requests);
  const broken = JSON.parse(JSON.stringify(s));
  delete broken.streamers[0].customization;
  assert.throws(() => decodeSave(JSON.stringify(broken)));
  const missingRequests = JSON.parse(JSON.stringify(s));
  delete missingRequests.requests;
  assert.throws(() => decodeSave(JSON.stringify(missingRequests)));
});

test("duplicate display names preserve distinct result identity and historic names", () => {
  let s = start();
  s.streamers.push(createStreamer(CHARACTERS[5]));
  for (const c of s.streamers) {
    c.affection = 40;
  }
  const old = calculateStream(s, s.streamers[0], "TALK", "f1");
  for (const id of ["hiyori", "momo"])
    s = reduceGame(s, {
      type: "CUSTOMIZE",
      id,
      customization: { ...emptyCustomization(true), displayName: "推し" },
    });
  const results = s.streamers.map((c) => calculateStream(s, c, "TALK", "f1"));
  assert.deepEqual(
    results.map((r) => r.streamerId),
    ["hiyori", "momo"],
  );
  assert.equal(old.name, "天音ひより");
  assert.equal(results[0].name, "推し");
});

test("four male characters are playable, scoutable and saveable while agency capacity stays 20", () => {
  assert.equal(CHARACTERS.filter((c) => c.gender === "male").length, 4);
  assert.equal(new Set(CHARACTERS.map((c) => c.id)).size, 24);
  assert.equal(capacity(30), 20);
  assert.ok(STARTER_IDS.includes("haruto"));
  for (const c of CHARACTERS.filter((c) => c.gender === "male")) {
    const s = start();
    s.streamers.push(createStreamer(c));
    assert.equal(decodeSave(JSON.stringify(s)).streamers[1].gender, "male");
  }
  assert.equal(
    reduceGame(initialState(), { type: "START", id: "haruto" }).streamers[0]
      .gender,
    "male",
  );
});
