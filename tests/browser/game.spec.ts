import { test, expect } from "@playwright/test";
import { CHARACTERS, CONFIG, FACILITIES } from "../../src/game/data.ts";
import { createStreamer, initialState } from "../../src/game/engine.ts";
import type { GameData } from "../../src/types.ts";
const makeSave = () => {
  const s = initialState(1234);
  s.started = true;
  s.streamers = [createStreamer(CHARACTERS[0])];
  return s;
};
async function seed(page: import("@playwright/test").Page, s: GameData) {
  await page.addInitScript(
    ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
    { key: CONFIG.saveKey, state: s },
  );
  await page.goto("/");
}
test("new game → stream result → save and reload", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("dialog")).toContainText("最初の夢");
  await page
    .getByRole("button", { name: "このライバーと事務所をはじめる" })
    .click();
  await page.getByRole("button", { name: "速度4倍" }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "配信", exact: true })
    .click();
  await page.getByRole("button", { name: "配信スタート" }).click();
  await expect(page.getByText("想い、届いたね。")).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole("button", { name: "おつかれさま！ オフィスへ" }).click();
  await page.reload();
  await expect(page.getByText("最初の夢を、一緒に。")).toHaveCount(0);
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    CONFIG.saveKey,
  );
  expect(saved.stats.streams).toBe(1);
  expect(saved.streamers[0].fanCount).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
test("scout and construction through real mobile controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await seed(page, makeSave());
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "ライバー", exact: true })
    .click();
  await page.getByRole("button", { name: "スカウト", exact: true }).click();
  await page.getByRole("button", { name: "契約 15,000G" }).first().click();
  await expect(page.getByRole("button", { name: "所属 2 / 3" })).toBeVisible();
  await page.getByRole("button", { name: "閉じる" }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "建設", exact: true })
    .click();
  await page.getByRole("button", { name: /配信ブース ライバー1人/ }).click();
  await expect(page.getByText("BUILD MODE")).toBeVisible();
  const canvas = page.locator("canvas"),
    box = (await canvas.boundingBox())!;
  await canvas.click({
    position: {
      x: box.width * 0.5,
      y:
        box.height / 2 +
        77.8 *
          Math.min(
            box.width / (8 * 84 + 120),
            (box.height - 12) / (8 * 44 + 155),
          ),
    },
  });
  await expect(page.getByRole("button", { name: "建設を確定" })).toBeEnabled();
  await page.getByRole("button", { name: "建設を確定" }).click();
  await expect(page.getByText("BUILD MODE")).toHaveCount(0);
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    CONFIG.saveKey,
  );
  expect(saved.facilities.length).toBe(4);
  expect(saved.streamers.length).toBe(2);
});
for (const viewport of [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
])
  test(`layout and modal boundaries ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await seed(page, makeSave());
    await page.waitForTimeout(1000);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    const canvas = await page.locator("canvas").boundingBox();
    expect(canvas!.height).toBeGreaterThan(180);
    await page.screenshot({
      path: `test-results/office-${viewport.width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "建設", exact: true })
      .click();
    const modal = await page.getByRole("dialog").boundingBox();
    expect(modal!.x).toBeGreaterThanOrEqual(0);
    expect(modal!.y).toBeGreaterThanOrEqual(0);
    expect(modal!.y + modal!.height).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({
      path: `test-results/build-${viewport.width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.getByRole("button", { name: "閉じる" }).click();
    expect(errors).toEqual([]);
  });
test("corrupt save shows recovery without overwriting original", async ({
  page,
}) => {
  await page.addInitScript(
    (key) => localStorage.setItem(key, "broken-data"),
    CONFIG.saveKey,
  );
  await page.goto("/");
  await expect(page.getByRole("dialog")).toContainText(
    "セーブデータを読み込めませんでした",
  );
  expect(
    await page.evaluate((key) => localStorage.getItem(key), CONFIG.saveKey),
  ).toBe("broken-data");
  await page.getByRole("button", { name: "新しいデータで開始する" }).click();
  await expect(page.getByRole("dialog")).toContainText("最初の夢");
});
test("late game has 20 actors, training, staff, monthly event and result", async ({
  page,
}) => {
  const s = makeSave();
  s.agencyLevel = 30;
  s.mapSize = 16;
  s.money = 5000000;
  s.streamers = [...CHARACTERS.slice(0, 16), ...CHARACTERS.slice(20)].map(
    createStreamer,
  );
  s.event.joined = true;
  s.event.score = 999999;
  s.event.entries = 1;
  s.day = 30;
  s.seconds = 42;
  s.facilities.push({ id: "sing-room", kind: "sing", x: 5, y: 5, level: 2 });
  await page.setViewportSize({ width: 1366, height: 768 });
  await seed(page, s);
  await page.getByRole("button", { name: "速度4倍" }).click();
  await expect(page.getByRole("dialog")).toContainText("オフィスレポート", {
    timeout: 10000,
  });
  await expect(page.getByRole("dialog")).toContainText("1位");
  await page.getByRole("button", { name: "新しい1か月へ" }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "スタッフ", exact: true })
    .click();
  await page.getByRole("button", { name: "採用", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "採用済み" })).toBeVisible();
  await page.getByRole("button", { name: "閉じる" }).click();
  await page.screenshot({ path: "test-results/late-game.png", fullPage: true });
});
test("modal pauses time and keyboard escape restores office", async ({
  page,
}) => {
  const state = makeSave();
  state.seconds = 38;
  await seed(page, state);
  await page.getByRole("button", { name: "速度4倍" }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "ライバー", exact: true })
    .click();
  await page.waitForTimeout(2500);
  await expect(page.locator(".hud-date")).toContainText("1日目");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".hud-date")).toContainText("2日目");
});

test("training completes through UI and persists the stat gain", async ({
  page,
}) => {
  const state = makeSave();
  state.agencyLevel = 3;
  state.facilities.push({
    id: "talk-room",
    kind: "talk",
    x: 5,
    y: 5,
    level: 1,
  });
  await seed(page, state);
  await page.getByRole("button", { name: "速度4倍" }).click();
  await page.getByRole("button", { name: "♫ 育成", exact: true }).click();
  await page.getByRole("button", { name: /トークレッスン/ }).click();
  await expect(page.locator(".activity")).toContainText("レッスン中");
  await expect
    .poll(async () =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).stats.training,
        CONFIG.saveKey,
      ),
    )
    .toBe(1);
  const value = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).streamers[0].stats.talk,
    CONFIG.saveKey,
  );
  expect(value).toBeGreaterThan(72);
});

test("backup restore survives leaving the page", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "このライバーと事務所をはじめる" })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "設定", exact: true })
    .click();
  const replacement = makeSave();
  replacement.money = 123456;
  replacement.day = 7;
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("input[type=file]").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(replacement)),
  });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".hud-date")).toContainText("7日目");
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).money,
      CONFIG.saveKey,
    ),
  ).toBe(123456);
});

test("canvas animates, supports touch drag and pinch, and resets camera", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page, makeSave());
  const canvas = page.locator("canvas");
  const raster = () =>
    canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL());
  const before = await raster();
  await page.waitForTimeout(800);
  const after = await raster();
  expect(before).not.toBe(after);
  await page.getByRole("button", { name: "一時停止", exact: true }).click();
  await page.waitForTimeout(100);
  const rect = (await canvas.boundingBox())!;
  const cx = rect.x + rect.width / 2,
    cy = rect.y + rect.height / 2;
  const session = await page.context().newCDPSession(page);
  const point = (id: number, x: number, y: number) => ({
    id,
    x,
    y,
    radiusX: 3,
    radiusY: 3,
    force: 1,
  });
  const stable = await raster();
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point(1, cx - 35, cy), point(2, cx + 35, cy)],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [point(1, cx - 65, cy), point(2, cx + 65, cy)],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(100);
  expect(await raster()).not.toBe(stable);
  await page.getByRole("button", { name: "カメラをリセット" }).click();
  await page.waitForTimeout(100);
  expect(await raster()).toBe(stable);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point(1, cx, cy)],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [point(1, cx + 35, cy + 25)],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(100);
  expect(await raster()).not.toBe(stable);
});

test("growing office renders every facility and multiple ON AIR booths", async ({
  page,
}) => {
  const state = makeSave();
  state.agencyLevel = 20;
  state.mapSize = 14;
  state.money = 820400;
  state.streamers = CHARACTERS.slice(0, 12).map(createStreamer);
  const kinds = [
    ...FACILITIES.map((f) => f.kind),
    "booth",
    "booth",
    "booth",
    "booth",
  ] as (typeof FACILITIES)[number]["kind"][];
  state.facilities = kinds.map((kind, i) => ({
    id: `showcase-${i}`,
    kind,
    x: Math.floor(i / 4) * 3 + 1,
    y: (i % 4) * 3 + 1,
    level: 2,
  }));
  state.facilities
    .filter((f) => f.kind === "booth")
    .forEach((f, i) => {
      state.streamers[i].job = {
        type: "STREAMING",
        facilityId: f.id,
        total: 20,
        remaining: 19,
        style: "SING",
      };
    });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await seed(page, state);
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "一時停止", exact: true }).click();
  await page.screenshot({
    path: "test-results/growing-office.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

for (const width of [390, 430, 1366, 1920]) {
  test(`fan requests claim, letter, next round and reload ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1080 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const s = makeSave();
    s.stats.streams = 2;
    s.requests = { round: 1, streams: 2, themed: 1, rests: 1, claimed: [] };
    await page.addInitScript(
      ({ key, s }) => {
        if (!sessionStorage.getItem("request-test-seeded")) {
          localStorage.setItem(key, JSON.stringify(s));
          sessionStorage.setItem("request-test-seeded", "yes");
        }
      },
      { key: CONFIG.saveKey, s },
    );
    await page.goto("/");
    await page.getByRole("button", { name: "一時停止", exact: true }).click();
    await page.locator(".mission-card").click();
    const board = page.getByRole("region", {
      name: "ファンからのお願い",
      exact: true,
    });
    await expect(board).toBeVisible();
    for (const title of [
      "ふたつの配信を届けよう",
      "いつもの声を届けて",
      "がんばった仲間にひと休み",
    ]) {
      await page
        .getByRole("button", { name: `${title}の報酬を受け取る`, exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: `${title} 受取済み`, exact: true }),
      ).toBeDisabled();
    }
    await expect(board).toContainText("応援してくれるみんなより");
    await page.screenshot({
      path: `test-results/requests-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    const bounds = await page.getByRole("dialog").boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.width).toBeLessThanOrEqual(width);
    await page.getByRole("button", { name: "次のお願いを開く" }).click();
    await expect(board).toContainText("小さな歌の贈りもの");
    await page.reload();
    await page.locator(".mission-card").click();
    await expect(board).toContainText("小さな歌の贈りもの");
    const saved = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      CONFIG.saveKey,
    );
    expect(saved.money).toBe(306500);
    expect(saved.requests.round).toBe(2);
    expect(saved.requests.claimed).toEqual([]);
    await page
      .getByRole("button", { name: "小さな歌の贈りものに挑戦", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText("配信をはじめよう");
    await expect(page.locator(".style-grid")).toContainText("ファンのお願い");
    expect(errors).toEqual([]);
  });
}

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 664 },
  { width: 430, height: 932 },
]) {
  test(`mobile garden maximizes viewport and returns to menus ${viewport.width}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await seed(page, makeSave());
    await page.getByRole("button", { name: "一時停止", exact: true }).click();
    const canvas = page.locator(".map-stage canvas");
    const normal = (await canvas.boundingBox())!;
    expect(normal.width).toBe(viewport.width);
    expect(normal.height / viewport.height).toBeGreaterThan(0.7);
    const controls = (await page.locator(".camera-controls").boundingBox())!;
    const mission = (await page.locator(".mission-card").boundingBox())!;
    expect(controls.y + controls.height).toBeLessThanOrEqual(mission.y);
    const selected = page.locator(".mobile-selected");
    await selected.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "閉じる", exact: true }).click();
    await page.getByRole("button", { name: "広く見る" }).click();
    const expanded = (await canvas.boundingBox())!;
    expect(expanded.height).toBe(viewport.height);
    await expect(page.getByRole("navigation")).toBeHidden();
    await page.getByRole("button", { name: "拡大", exact: true }).click();
    await page
      .getByRole("button", { name: "カメラをリセット", exact: true })
      .click();
    await page.screenshot({
      path: `test-results/garden-focus-${viewport.width}.png`,
    });
    await page.getByRole("button", { name: "メニューに戻る" }).click();
    await expect(page.getByRole("navigation")).toBeVisible();
    await page.locator(".mission-card").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "閉じる", exact: true }).click();
    await page.reload();
    await expect(selected).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
      ),
    ).toBeTruthy();
  });
}
