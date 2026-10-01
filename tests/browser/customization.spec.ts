import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { CHARACTERS, CONFIG } from "../../src/game/data.ts";
import { initialState, createStreamer } from "../../src/game/engine.ts";
import type { GameData } from "../../src/types.ts";
const makeSave = (bond = 40) => {
  const s = initialState(123);
  s.started = true;
  s.streamers = [createStreamer(CHARACTERS[0])];
  s.streamers[0].affection = bond;
  return s;
};
async function seed(page: Page, s = makeSave()) {
  await page.addInitScript(
    ({ key, s, token }) => {
      if (!sessionStorage.getItem(token)) {
        localStorage.setItem(key, JSON.stringify(s));
        sessionStorage.setItem(token, "seeded");
      }
    },
    { key: CONFIG.saveKey, s, token: `seed-${Math.random()}` },
  );
  await page.goto("/");
  await page.getByRole("button", { name: "一時停止", exact: true }).click();
}
const saved = (page: Page): Promise<GameData> =>
  page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    CONFIG.saveKey,
  );
async function detail(page: Page) {
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "ライバー", exact: true })
    .click();
  await page.locator(".character-card").first().click();
}
async function editor(page: Page) {
  await detail(page);
  await page.getByRole("dialog").locator(".custom-unlock").click();
  await expect(
    page.getByRole("button", { name: "この姿で決定" }),
  ).toBeEnabled();
}
async function image(page: Page) {
  const base64 = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 200;
    c.height = 300;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#dc3e86";
    ctx.fillRect(50, 20, 100, 260);
    ctx.fillStyle = "#284ac6";
    ctx.fillRect(80, 30, 40, 60);
    return c.toDataURL("image/png").split(",")[1];
  });
  return {
    name: "my-liver.png",
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  };
}
async function settings(page: Page) {
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "その他", exact: true })
    .click();
  await page.getByRole("dialog").getByRole("button", { name: /^設定/ }).click();
}
for (const width of [390, 430, 1366, 1920]) {
  test(`custom name, image, walking canvas, cancel and reload at ${width}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      const original = CanvasRenderingContext2D.prototype.drawImage;
      const seen = new Set<string>();
      Object.assign(window, { gardenCustomImages: seen });
      CanvasRenderingContext2D.prototype.drawImage = function (
        ...args: unknown[]
      ) {
        const img = args[0];
        if (
          this.canvas.getAttribute("aria-label")?.startsWith("事務所の箱庭") &&
          img instanceof HTMLImageElement &&
          img.src.startsWith("blob:")
        )
          seen.add(img.src);
        return Reflect.apply(original, this, args);
      };
    });
    await page.setViewportSize({ width, height: width < 650 ? 844 : 900 });
    await seed(page);
    await editor(page);
    const before = await saved(page);
    await page.getByLabel("推しの名前").fill("キャンセルする名前");
    await page.getByRole("button", { name: "キャンセル", exact: true }).click();
    expect((await saved(page)).streamers[0].name).toBe(
      before.streamers[0].name,
    );
    await editor(page);
    await page.getByLabel("推しの名前").fill("私の推し🌸");
    await page
      .getByLabel("プロフィールの画像を選ぶ")
      .setInputFiles(await image(page));
    await expect(page.getByLabel("プロフィールの画像プレビュー")).toBeVisible();
    await page.getByLabel("箱庭の表示方法").selectOption("figure");
    await expect(
      page.getByRole("button", { name: "この姿で決定" }),
    ).toBeEnabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    const box = await page.getByRole("dialog").boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    await page.screenshot({
      path: `test-results/custom-editor-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "この姿で決定" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const result = await saved(page);
    expect(result.streamers[0].name).toBe("私の推し🌸");
    expect(result.streamers[0].stats).toEqual(before.streamers[0].stats);
    expect(result.streamers[0].customization.miniMode).toBe("figure");
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as typeof window & { gardenCustomImages: Set<string> })
              .gardenCustomImages.size,
        ),
      )
      .toBe(1);
    await expect(
      page.locator('.avatar[src^="blob:"]:visible').first(),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/custom-office-${width}.png`,
      fullPage: true,
    });
    await page.reload();
    await page.getByRole("button", { name: "一時停止", exact: true }).click();
    await expect
      .poll(() => page.locator('.avatar[src^="blob:"]').count())
      .toBeGreaterThan(0);
    expect((await saved(page)).streamers[0].name).toBe("私の推し🌸");
    await editor(page);
    await expect(page.getByLabel("プロフィールと同じ画像を使う")).toBeChecked();
    await page.getByLabel("推しの名前").fill("改名した推し");
    await page.getByRole("button", { name: "この姿で決定" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect((await saved(page)).streamers[0].customization.miniId).toBe(
      result.streamers[0].customization.miniId,
    );
    expect(errors).toEqual([]);
  });
}

test("images survive backup export, deletion and restore; reset image keeps bond", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await editor(page);
  await page.getByLabel("推しの名前").fill("バックアップ推し");
  await page
    .getByLabel("プロフィールの画像を選ぶ")
    .setInputFiles(await image(page));
  await expect(
    page.getByRole("button", { name: "この姿で決定" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "この姿で決定" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await settings(page);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "バックアップを書き出す" }).click();
  const download = await downloadPromise;
  const buffer = await readFile((await download.path())!);
  const backup = JSON.parse(buffer.toString());
  expect(Object.keys(backup.images)).toHaveLength(2);
  const alpha = await page.evaluate(async (data) => {
    const blob = await (await fetch(data)).blob();
    const image = await createImageBitmap(blob);
    const c = document.createElement("canvas");
    c.width = image.width;
    c.height = image.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    image.close();
    return ctx.getImageData(0, 0, 1, 1).data[3];
  }, backup.images[backup.game.streamers[0].customization.miniId]);
  expect(alpha).toBe(0);
  await page.getByRole("button", { name: "閉じる", exact: true }).click();
  // Clear media with the actual in-app reset (removes previously referenced images).
  await settings(page);
  await page.getByText("データをリセット", { exact: true }).click();
  await page
    .getByRole("button", { name: "リセットを確認", exact: true })
    .click();
  await page
    .getByRole("button", { name: "本当に消去して最初から始める" })
    .click();
  await page
    .getByRole("button", { name: "このライバーと事務所をはじめる" })
    .click();
  await settings(page);
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .locator('input[accept=".json,application/json"]')
    .setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer,
    });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await saved(page)).streamers[0].name).toBe("バックアップ推し");
  await expect
    .poll(() => page.locator('.avatar[src^="blob:"]').count())
    .toBeGreaterThan(0);
  await editor(page);
  await page
    .getByRole("button", { name: "プロフィール画像を元に戻す", exact: true })
    .click();
  await page
    .getByRole("button", { name: "箱庭の姿を元に戻す", exact: true })
    .click();
  await page
    .getByRole("button", { name: "名前を元に戻す", exact: true })
    .click();
  await page.getByRole("button", { name: "この姿で決定" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const custom = (await saved(page)).streamers[0].customization;
  expect(custom.unlocked).toBe(true);
  expect(custom.portraitId).toBeNull();
  expect(custom.miniId).toBeNull();
});

test("IndexedDB failure keeps name and image metadata, then retry succeeds", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await editor(page);
  await page
    .getByLabel("プロフィールの画像を選ぶ")
    .setInputFiles(await image(page));
  await page.getByLabel("推しの名前").fill("画像保存の推し");
  await expect(
    page.getByRole("button", { name: "この姿で決定" }),
  ).toBeEnabled();
  await page.evaluate(() => {
    const original = IDBFactory.prototype.open;
    let fail = true;
    IDBFactory.prototype.open = function (name, version) {
      if (fail) {
        fail = false;
        throw new DOMException("denied", "SecurityError");
      }
      return original.call(this, name, version);
    };
  });
  await page.getByRole("button", { name: "この姿で決定" }).click();
  await expect(page.getByRole("alert")).toContainText("以前の設定は保持");
  expect((await saved(page)).streamers[0].name).toBe("天音ひより");
  expect((await saved(page)).streamers[0].customization.portraitId).toBeNull();
  await page.getByRole("button", { name: "この姿で決定" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await saved(page)).streamers[0].name).toBe("画像保存の推し");
});

test("separate garden image, badge rendering, walking motion and missing-image fallback", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.drawImage;
    const positions = new Set<string>();
    Object.assign(window, { gardenPositions: positions });
    CanvasRenderingContext2D.prototype.drawImage = function (
      ...args: unknown[]
    ) {
      const img = args[0];
      if (
        this.canvas.getAttribute("aria-label")?.startsWith("事務所の箱庭") &&
        img instanceof HTMLImageElement &&
        img.src.startsWith("blob:")
      )
        positions.add(`${args[1]},${args[2]}`);
      return Reflect.apply(original, this, args);
    };
  });
  await seed(page);
  await editor(page);
  await page.getByLabel("推しの名前").fill("🌸".repeat(20));
  await page.getByLabel("箱庭の画像を選ぶ").setInputFiles(await image(page));
  await expect(
    page.getByRole("button", { name: "この姿で決定" }),
  ).toBeEnabled();
  await expect(
    page.getByLabel("プロフィールと同じ画像を使う"),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "この姿で決定" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const state = await saved(page);
  expect(state.streamers[0].customization.portraitId).toBeNull();
  expect(state.streamers[0].customization.miniId).not.toBeNull();
  await page.getByRole("button", { name: "速度4倍" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { gardenPositions: Set<string> })
            .gardenPositions.size,
      ),
    )
    .toBeGreaterThan(5);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "一時停止", exact: true }).click();
  state.streamers[0].customization.portraitId = "custom-missing";
  state.streamers[0].customization.miniId = "custom-missing";
  await seed(page, state);
  await editor(page);
  await expect(page.getByRole("alert")).toContainText("画像が見つかりません");
  await expect(
    page.getByRole("button", { name: "この姿で決定" }),
  ).toBeEnabled();
});

test("locked bond, invalid image and failed persistence leave previous customization intact", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await seed(page, makeSave(39));
  await detail(page);
  await expect(
    page.getByRole("dialog").locator(".custom-unlock"),
  ).toBeDisabled();
  await expect(page.getByRole("dialog")).toContainText("39 / 40");
  await page.getByRole("button", { name: "閉じる", exact: true }).click();
  await seed(page);
  await editor(page);
  await page
    .getByLabel("プロフィールの画像を選ぶ")
    .setInputFiles({
      name: "bad.png",
      mimeType: "image/png",
      buffer: Buffer.from("broken"),
    });
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel("推しの名前").fill("保存失敗");
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "hoshimusubi-save-v1" && value.includes("保存失敗"))
        throw new DOMException("quota", "QuotaExceededError");
      original.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: "この姿で決定" }).click();
  await expect(page.getByRole("alert")).toContainText("以前の設定は保持");
  expect((await saved(page)).streamers[0].name).toBe("天音ひより");
});

test("male starter and old version 1 backup retain original progress", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: /陽向ハルト/ }).click();
  await page
    .getByRole("button", { name: "このライバーと事務所をはじめる" })
    .click();
  expect((await saved(page)).streamers[0].id).toBe("haruto");
  const legacy = JSON.parse(JSON.stringify(makeSave()));
  legacy.version = 1;
  delete legacy.streamers[0].customization;
  legacy.money = 123456;
  await settings(page);
  page.once("dialog", (d) => d.accept());
  await page
    .locator('input[accept=".json,application/json"]')
    .setInputFiles({
      name: "old.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(legacy)),
    });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await saved(page)).money).toBe(123456);
  expect((await saved(page)).streamers[0].customization.unlocked).toBe(true);
});
