import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { initialState, reduceGame } from "../src/game/engine.ts";
import { CONFIG } from "../src/game/data.ts";

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  await page.goto(process.env.TEST_URL ?? "http://127.0.0.1:5187/pages-check/");
  await page
    .getByRole("button", { name: "このライバーと事務所をはじめる" })
    .click();
  await page.reload();
  assert.equal(await page.getByText("最初の夢を、一緒に。").count(), 0);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.equal(await page.locator("canvas").count(), 1);
  const state = reduceGame(initialState(123), { type: "START", id: "haruto" });
  state.streamers[0].affection = 40;
  await page.addInitScript(
    ({ state, key }) => {
      Object.defineProperty(crypto, "randomUUID", {
        value: undefined,
        configurable: true,
      });
      if (!sessionStorage.getItem("production-custom-seeded")) {
        localStorage.setItem(key, JSON.stringify(state));
        sessionStorage.setItem("production-custom-seeded", "yes");
      }
    },
    { state, key: CONFIG.saveKey },
  );
  await page.reload();
  await page.getByRole("button", { name: "一時停止", exact: true }).click();
  await page.locator(".mobile-selected").click();
  await page.getByRole("dialog").locator(".custom-unlock").click();
  await expect(
    page.getByRole("button", { name: "この姿で決定" }),
  ).toBeEnabled();
  await page.getByLabel("推しの名前").fill("本番確認の推し");
  const fixture = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 200;
    c.height = 300;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#4b94b2";
    ctx.fillRect(60, 20, 80, 260);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page.getByLabel("プロフィールの画像を選ぶ").setInputFiles({
    name: "production-fixture.png",
    mimeType: "image/png",
    buffer: Buffer.from(fixture, "base64"),
  });
  await expect(
    page.getByRole("button", { name: "この姿で決定" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "この姿で決定" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(
    page.locator('.mobile-selected img[src^="blob:"]'),
  ).toBeVisible();
  const persisted = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    CONFIG.saveKey,
  );
  assert.equal(persisted.streamers[0].id, "haruto");
  assert.equal(persisted.streamers[0].name, "本番確認の推し");
  assert.ok(persisted.streamers[0].customization.miniId);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: "test-results/production-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "Production URL: male starter, customization, image persistence, reload, canvas, layout and network/console checks passed.",
  );
} finally {
  await browser.close();
}
