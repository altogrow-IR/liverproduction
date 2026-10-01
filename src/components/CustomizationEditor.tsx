import { useEffect, useRef, useState } from "react";
import type { Crop } from "../game/imageEditing.ts";
import type { Customization, Streamer } from "../types.ts";
import { CHARACTERS } from "../game/data.ts";
import {
  defaultCrop,
  drawCrop,
  importImage,
  loadImage,
  cropBlob,
} from "../game/imageEditing.ts";
import { mediaUrl, newMediaId } from "../game/media.ts";
import { nameLength, validName } from "../game/customization.ts";
import { Avatar } from "./common.tsx";

function ImageAdjustment({
  source,
  crop,
  change,
  kind,
}: {
  source: string;
  crop: Crop;
  change: (value: Crop) => void;
  kind: "portrait" | "badge" | "figure";
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true;
    void loadImage(source)
      .then((image) => {
        if (active && ref.current)
          drawCrop(ref.current, image, crop, kind === "figure");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [source, crop, kind]);
  const label = kind === "portrait" ? "プロフィール" : "箱庭";
  return (
    <div className="image-adjustment">
      <canvas
        ref={ref}
        width={kind === "badge" ? 256 : 192}
        height={kind === "badge" ? 256 : kind === "portrait" ? 256 : 264}
        className={kind === "badge" ? "badge-preview" : ""}
        aria-label={`${label}の画像プレビュー`}
      />
      <div className="crop-controls">
        {(
          [
            ["zoom", "拡大", 1, 3, 0.05],
            ["x", "左右の位置", -100, 100, 1],
            ["y", "上下の位置", -100, 100, 1],
          ] as const
        ).map(([key, title, min, max, step]) => (
          <label key={key}>
            {title}
            <input
              aria-label={`${label}：${title}`}
              type="range"
              min={min}
              max={max}
              step={step}
              value={crop[key]}
              onChange={(e) =>
                change({ ...crop, [key]: Number(e.target.value) })
              }
            />
          </label>
        ))}
        <button type="button" onClick={() => change(defaultCrop())}>
          位置を中央に戻す
        </button>
      </div>
    </div>
  );
}

export function CustomizationEditor({
  person,
  save,
  close,
  onBusy,
}: {
  person: Streamer;
  save: (
    id: string,
    custom: Customization,
    entries: { id: string; blob: Blob }[],
  ) => Promise<boolean>;
  close: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const original = CHARACTERS.find((c) => c.id === person.id)!;
  const [name, setName] = useState(person.name);
  const [portrait, setPortrait] = useState<string | null>(null);
  const [mini, setMini] = useState<string | null>(null);
  const [same, setSame] = useState(person.customization.miniUsesPortrait);
  const [portraitDirty, setPortraitDirty] = useState(false);
  const [miniDirty, setMiniDirty] = useState(false);
  const [mode, setMode] = useState(person.customization.miniMode);
  const [portraitCrop, setPortraitCrop] = useState(defaultCrop);
  const [miniCrop, setMiniCrop] = useState(defaultCrop);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const createdUrls = useRef<string[]>([]);
  useEffect(() => {
    let active = true;
    void Promise.all([
      person.customization.portraitId
        ? mediaUrl(person.customization.portraitId)
        : undefined,
      person.customization.miniId
        ? mediaUrl(person.customization.miniId)
        : undefined,
    ]).then(([p, m]) => {
      if (!active) return;
      setPortrait(p ?? null);
      setMini(m ?? null);
      setLoading(false);
      if (
        (person.customization.portraitId && !p) ||
        (person.customization.miniId && !m)
      )
        setMessage(
          "保存した画像が見つかりません。画像を選び直すか、画像付きバックアップを復元してください。",
        );
    });
    return () => {
      active = false;
      createdUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [person.id, person.customization.portraitId, person.customization.miniId]);
  const working = busy || loading;
  const miniSource = same ? (mini ?? portrait) : mini;
  const trimmed = name.trim();
  const upload = async (
    file: File | undefined,
    target: "portrait" | "mini",
  ) => {
    if (!file) return;
    setBusy(true);
    onBusy(true);
    setMessage("");
    try {
      const url = await importImage(file);
      createdUrls.current.push(url);
      if (target === "portrait") {
        setPortrait(url);
        setPortraitDirty(true);
        setPortraitCrop(defaultCrop());
        if (same) {
          setMini(null);
          setMiniDirty(true);
        }
      } else {
        setMini(url);
        setSame(false);
        setMiniDirty(true);
        setMiniCrop(defaultCrop());
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "画像を読み込めませんでした。",
      );
    } finally {
      setBusy(false);
      onBusy(false);
    }
  };
  const submit = async () => {
    if (!validName(trimmed) || working) return;
    setBusy(true);
    onBusy(true);
    setMessage("");
    try {
      const entries: { id: string; blob: Blob }[] = [];
      const make = async (
        url: string | null,
        crop: Crop,
        kind: "portrait" | "badge" | "figure",
      ) => {
        if (!url) return null;
        const id = newMediaId();
        entries.push({ id, blob: await cropBlob(url, crop, kind) });
        return id;
      };
      const custom: Customization = {
        unlocked: true,
        displayName: trimmed === original.name ? null : trimmed,
        portraitId: portraitDirty
          ? await make(portrait, portraitCrop, "portrait")
          : person.customization.portraitId,
        miniId: miniDirty
          ? await make(miniSource, miniCrop, mode)
          : person.customization.miniId,
        miniMode: mode,
        miniUsesPortrait: same,
      };
      if (!(await save(person.id, custom, entries)))
        throw Error(
          "保存できませんでした。以前の設定は保持しています。空き容量を確認して、もう一度お試しください。",
        );
      onBusy(false);
      close();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "保存できませんでした。",
      );
      setBusy(false);
      onBusy(false);
    }
  };
  return (
    <div className="custom-editor">
      <p className="custom-intro">
        絆を育てたライバーを、私だけの推しに。名前とイラストは何度でも無料で変更できます。
      </p>
      <fieldset disabled={working}>
        <label className="custom-name">
          推しの名前
          <input
            value={name}
            maxLength={256}
            onChange={(e) => setName(e.target.value)}
            aria-label="推しの名前"
            placeholder={original.name}
          />
          <small>{nameLength(trimmed)} / 20文字</small>
        </label>
        {!validName(trimmed) && (
          <p role="alert">名前は改行なしの1〜20文字で入力してください。</p>
        )}
        <button type="button" onClick={() => setName(original.name)}>
          名前を元に戻す
        </button>
        <div className="custom-preview-grid">
          <section>
            <h3>プロフィールのイラスト</h3>
            <label className="file-button">
              画像を選ぶ
              <input
                aria-label="プロフィールの画像を選ぶ"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  void upload(e.target.files?.[0], "portrait");
                  e.target.value = "";
                }}
              />
            </label>
            {portrait ? (
              <ImageAdjustment
                source={portrait}
                crop={portraitCrop}
                change={(crop) => {
                  setPortraitCrop(crop);
                  setPortraitDirty(true);
                }}
                kind="portrait"
              />
            ) : (
              <div className="original-preview">
                <Avatar person={original} large />
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setPortrait(null);
                setPortraitDirty(true);
                if (same) {
                  setMini(null);
                  setMiniDirty(true);
                }
                setPortraitCrop(defaultCrop());
              }}
            >
              プロフィール画像を元に戻す
            </button>
          </section>
          <section>
            <h3>箱庭で歩く姿</h3>
            <label className="toggle-row">
              <span>プロフィールと同じ画像を使う</span>
              <input
                type="checkbox"
                checked={same}
                onChange={(e) => {
                  setSame(e.target.checked);
                  if (e.target.checked) setMini(null);
                  setMiniDirty(true);
                  setMiniCrop(defaultCrop());
                }}
              />
            </label>
            <label className="file-button">
              箱庭用の画像を選ぶ
              <input
                aria-label="箱庭の画像を選ぶ"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  void upload(e.target.files?.[0], "mini");
                  e.target.value = "";
                }}
              />
            </label>
            <label className="custom-mode">
              表示方法
              <select
                aria-label="箱庭の表示方法"
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value as "badge" | "figure");
                  setMiniDirty(true);
                  setMiniCrop(defaultCrop());
                }}
              >
                <option value="badge">
                  丸いアイコン（顔・背景付き画像向け）
                </option>
                <option value="figure">全身の姿（透過イラスト向け）</option>
              </select>
            </label>
            <div className="garden-preview">
              {miniSource ? (
                <ImageAdjustment
                  source={miniSource}
                  crop={miniCrop}
                  change={(crop) => {
                    setMiniCrop(crop);
                    setMiniDirty(true);
                  }}
                  kind={mode}
                />
              ) : (
                <div className="original-preview">
                  <Avatar person={original} />
                </div>
              )}
              <strong>{trimmed || original.name}</strong>
            </div>
            <button
              type="button"
              onClick={() => {
                setMini(null);
                setSame(false);
                setMiniDirty(true);
                setMiniCrop(defaultCrop());
              }}
            >
              箱庭の姿を元に戻す
            </button>
          </section>
        </div>
        <p className="custom-help">
          PNG・JPEG・WebP /
          10MB以下。透過画像は背景を透過したまま保存します。画像はこのブラウザに保存されます。機種変更前に画像付きバックアップを書き出してください。
        </p>
      </fieldset>
      {message && (
        <p role="alert" className="warning">
          {message}
        </p>
      )}
      <div className="custom-actions">
        <button disabled={working} onClick={close}>
          キャンセル
        </button>
        <button
          className="primary"
          disabled={working || !validName(trimmed)}
          onClick={() => void submit()}
        >
          {working ? "準備しています…" : "この姿で決定"}
        </button>
      </div>
    </div>
  );
}
