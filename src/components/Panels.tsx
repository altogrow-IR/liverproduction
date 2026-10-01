import { useState } from "react";
import { RequestBoard } from "./RequestBoard.tsx";
import { requestTheme } from "../game/requests.ts";
import type {
  Action,
  FacilityKind,
  GameData,
  Role,
  Stat,
  Streamer,
  Style,
} from "../types.ts";
import {
  ACHIEVEMENTS,
  CHARACTERS,
  EVENTS,
  FACILITIES,
  NPCS,
  PRICES,
  RANKS,
  ROLES,
  STATS,
  STYLES,
  capacity,
  format,
  staffCapacity,
} from "../game/data.ts";
import {
  absoluteDay,
  achievementReady,
  streamBlock,
  totalFans,
} from "../game/engine.ts";
import { exportBackup, importBackup } from "../game/backup.ts";
import { MAX_BACKUP_BYTES } from "../game/media.ts";
import { Avatar, Icon, Meter } from "./common.tsx";
export type Panel =
  | "livers"
  | "stream"
  | "build"
  | "staff"
  | "business"
  | "achievements"
  | "settings"
  | "news"
  | "missions"
  | "more"
  | "detail"
  | "train"
  | "facility"
  | "customize";
interface Props {
  panel: Panel;
  state: GameData;
  person: Streamer;
  dispatch: (a: Action) => void;
  select: (id: string) => void;
  open: (p: Panel) => void;
  close: () => void;
  build: (kind: FacilityKind) => void;
  facilityId: string | null;
  reset: () => void;
  restore: (
    s: GameData,
    entries?: { id: string; blob: Blob }[],
  ) => Promise<boolean>;
}
export const PANEL_NAMES: Record<Panel, string> = {
  livers: "ライバーとスカウト",
  stream: "配信をはじめよう",
  build: "理想のオフィスをつくろう",
  staff: "事務所を支える仲間",
  business: "経営とイベント",
  achievements: "夢のあしあと",
  settings: "設定",
  news: "最近のできごと",
  missions: "ファンのお願いと目標",
  more: "その他のメニュー",
  detail: "ライバー詳細",
  train: "レッスン",
  facility: "施設の詳細",
  customize: "私だけの推し",
};
export function Panels(p: Props) {
  const { panel, state: s, person, dispatch, open, close } = p;
  const [rosterTab, setRosterTab] = useState<"team" | "scout">("team");
  const [style, setStyle] = useState<Style>(
    person.preferredStyle === "COLLAB" ? "TALK" : person.preferredStyle,
  );
  const [partner, setPartner] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [backupBusy, setBackupBusy] = useState(false);
  if (panel === "livers")
    return (
      <>
        <div className="tab-row two">
          <button
            className={rosterTab === "team" ? "active" : ""}
            onClick={() => setRosterTab("team")}
          >
            所属 {s.streamers.length} / {capacity(s.agencyLevel)}
          </button>
          <button
            className={rosterTab === "scout" ? "active" : ""}
            onClick={() => setRosterTab("scout")}
          >
            スカウト
          </button>
        </div>
        {rosterTab === "team" ? (
          <div className="card-grid">
            {s.streamers.map((c) => (
              <button
                className="character-card"
                key={c.id}
                onClick={() => {
                  p.select(c.id);
                  open("detail");
                }}
              >
                <Avatar person={c} />
                <span className="small muted">{c.nickname}</span>
                <h3>{c.name}</h3>
                <span className="rank">{RANKS[c.rankIndex]}</span>{" "}
                <span>Lv{c.level}</span>
                <p>♡ {format(c.fanCount)} FAN</p>
                <small>
                  {c.job ? "活動中" : "待機中"} {c.auto ? "・おまかせON" : ""}
                </small>
              </button>
            ))}
            <button
              className="recruit-card"
              onClick={() => setRosterTab("scout")}
            >
              <span>＋</span>
              <b>新しい仲間を探す</b>
              <small>最初の一歩を、一緒に。</small>
            </button>
          </div>
        ) : (
          <>
            <div className="banner">
              才能の芽を見つけよう。どのライバーも、育て方次第で事務所のエースに。
            </div>
            <div className="card-grid">
              {s.candidates
                .map((id) => CHARACTERS.find((c) => c.id === id)!)
                .filter(Boolean)
                .map((c) => (
                  <article className="character-card" key={c.id}>
                    <Avatar person={c} />
                    <span className="small muted">
                      {c.rarity} ・ {c.nickname}
                    </span>
                    <h3>{c.name}</h3>
                    <p className="small">{c.description}</p>
                    <button
                      className="primary full"
                      disabled={
                        s.money < PRICES[c.rarity] ||
                        s.streamers.length >= capacity(s.agencyLevel)
                      }
                      onClick={() => dispatch({ type: "SCOUT", id: c.id })}
                    >
                      契約 {format(PRICES[c.rarity])}G
                    </button>
                  </article>
                ))}
            </div>
            {!s.candidates.length && (
              <p className="empty">
                候補はすべて所属しました。更新して新しい出会いへ。
              </p>
            )}
            <button
              className="full"
              disabled={absoluteDay(s) < s.freeRefreshDay && s.money < 5000}
              onClick={() => dispatch({ type: "REFRESH" })}
            >
              候補を更新{" "}
              {absoluteDay(s) >= s.freeRefreshDay ? "無料" : "5,000G"}
            </button>
            <p className="small muted">
              7日ごとに無料更新1回。次回：
              {Math.max(0, s.freeRefreshDay - absoluteDay(s))}
              日後。所属上限はLv5 / 10 / 15 / 20 / 30で増えます。
            </p>
          </>
        )}
      </>
    );
  if (panel === "stream") {
    const block = streamBlock(s, person, style, partner);
    return (
      <>
        <div className="compact-profile">
          <Avatar person={person} />
          <div>
            <h3>{person.name}</h3>
            <span className="muted">
              Mood {Math.floor(person.mood)} ・ 疲労{" "}
              {Math.floor(person.fatigue)}
            </span>
          </div>
        </div>
        <label className="field">
          配信するライバー
          <select value={person.id} onChange={(e) => p.select(e.target.value)}>
            {s.streamers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.job ? "（活動中）" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="style-grid">
          {(Object.entries(STYLES) as [Style, (typeof STYLES)[Style]][]).map(
            ([key, d]) => (
              <button
                className={style === key ? "selected" : ""}
                key={key}
                disabled={key === "COLLAB" && s.agencyLevel < 7}
                onClick={() => {
                  setStyle(key);
                  setConfirm(false);
                }}
              >
                <span>{d.icon}</span>
                <b>{d.name}</b>
                <small>
                  {key === person.preferredStyle
                    ? "得意！"
                    : key === "COLLAB"
                      ? "Lv7で解放"
                      : `成果 ×${d.mult.toFixed(2)}`}
                </small>
                {key === requestTheme(s).style && s.requests.themed === 0 && (
                  <small>✉ ファンのお願い</small>
                )}
              </button>
            ),
          )}
        </div>
        {style === "COLLAB" && (
          <label className="field">
            コラボ相手
            <select
              value={partner}
              onChange={(e) => setPartner(e.target.value)}
            >
              <option value="">相手を選択</option>
              {s.streamers
                .filter((c) => c.id !== person.id && !c.job && c.fatigue < 90)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        <div className="banner">
          {style === "ENDURANCE" ? "約20秒・疲労 +32" : "約12秒・疲労 +22"}
          （ゲーム内時間）
          <br />
          夜は視聴者 ×1.30。得意と体調を考えて配信しよう。
        </div>
        {block && <p className="warning">{block}</p>}
        {person.fatigue >= 90 && (
          <p className="warning">
            疲労が限界に近づいています。事故を避けるため休憩をおすすめします。
          </p>
        )}
        <button
          className="primary full"
          disabled={!!block}
          onClick={() => {
            if (person.fatigue >= 90 && !confirm) {
              setConfirm(true);
              return;
            }
            dispatch({
              type: "STREAM",
              id: person.id,
              style,
              partnerId: style === "COLLAB" ? partner : undefined,
              force: confirm,
            });
            close();
          }}
        >
          <Icon name="mic" />
          {person.fatigue >= 90
            ? confirm
              ? "体調に注意して配信する"
              : "警告を確認して続ける"
            : "配信スタート"}
        </button>
      </>
    );
  }
  if (panel === "train")
    return (
      <>
        <div className="banner">
          {person.name}の小さな一歩。1回5,000G / 約9秒。能力上限100。
        </div>
        <div className="choice-list">
          {(["talk", "sing", "project", "endurance"] as Stat[]).map((stat) => (
            <button
              disabled={
                s.money < 5000 ||
                !!person.job ||
                s.agencyLevel < 3 ||
                person.stats[stat] >= 100 ||
                !s.facilities.some(
                  (f) => f.kind === (stat === "endurance" ? "desk" : stat),
                )
              }
              key={stat}
              onClick={() => {
                dispatch({ type: "TRAIN", id: person.id, stat });
                close();
              }}
            >
              <span>
                <b>
                  {stat === "endurance" ? "自主練" : STATS[stat] + "レッスン"}
                </b>
                <small>現在 {Math.floor(person.stats[stat])} / 100</small>
              </span>
              <span>5,000G →</span>
            </button>
          ))}
        </div>
        <p className="small muted">
          トーク・歌・企画には対応する施設が必要です。自主練は社長デスクを利用します。
        </p>
      </>
    );
  if (panel === "build")
    return (
      <>
        <div className="banner">
          施設を選んで、空いた2×2マスをタップ。
          <br />
          緑のプレビューを確認してから建設できます。
        </div>
        <div className="facility-grid">
          {FACILITIES.map((d) => (
            <button
              key={d.kind}
              className="facility-card"
              disabled={s.agencyLevel < d.unlock || s.money < d.price}
              onClick={() => p.build(d.kind)}
            >
              <span
                className="facility-icon"
                style={{ background: d.color + "50" }}
              >
                {d.icon}
              </span>
              <div>
                <h3>{d.name}</h3>
                <small>{d.description}</small>
                <b>
                  {s.agencyLevel < d.unlock
                    ? `Lv${d.unlock}で解放`
                    : format(d.price) + "G"}
                </b>
              </div>
            </button>
          ))}
        </div>
        <h3>現在の施設</h3>
        <div className="choice-list">
          {s.facilities.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                p.close();
                p.open("facility");
                p.select("facility:" + f.id);
              }}
            >
              <span>
                {FACILITIES.find((d) => d.kind === f.kind)!.name}{" "}
                <small>
                  ({f.x}, {f.y})
                </small>
              </span>
              <b>Lv{f.level} →</b>
            </button>
          ))}
        </div>
      </>
    );
  if (panel === "facility") {
    const f = s.facilities.find((f) => f.id === p.facilityId);
    if (!f) return <p>マップ上の施設を選んでください。</p>;
    const d = FACILITIES.find((d) => d.kind === f.kind)!;
    const cost = Math.floor(d.price * Math.pow(1.7, f.level));
    return (
      <>
        <div
          className="facility-feature"
          style={{ background: d.color + "40" }}
        >
          <span>{d.icon}</span>
          <h3>{d.name}</h3>
          <b>Lv {f.level} / 3</b>
        </div>
        <p>{d.description}</p>
        <p className="muted">
          配置：{f.x}, {f.y} / 強化倍率：×{1 + (f.level - 1) * 0.5}
        </p>
        <button
          className="primary full"
          disabled={f.level >= 3 || s.money < cost}
          onClick={() => dispatch({ type: "UPGRADE", id: f.id })}
        >
          {f.level >= 3 ? "最大レベルです" : `強化する ${format(cost)}G`}
        </button>
      </>
    );
  }
  if (panel === "staff")
    return (
      <>
        <div className="banner">
          採用時に給与1か月分の契約費、その後は毎月末に給与を支払います。
          <br />
          スタッフ {s.staff.length} / {staffCapacity(s.agencyLevel)} ・
          効果は役割ごとに1人分
        </div>
        <div className="choice-list">
          {(Object.entries(ROLES) as [Role, (typeof ROLES)[Role]][]).map(
            ([role, d]) => {
              const hired = s.staff.some((p) => p.role === role);
              return (
                <article className="staff-card" key={role}>
                  <div className="staff-symbol">
                    <Icon name="people" size={30} />
                  </div>
                  <div>
                    <h3>{d.name}</h3>
                    <p className="small muted">{d.description}</p>
                    <b>{format(d.salary)}G / 月</b>
                  </div>
                  <button
                    disabled={
                      hired ||
                      s.agencyLevel < 2 ||
                      s.staff.length >= staffCapacity(s.agencyLevel) ||
                      s.money < d.salary
                    }
                    onClick={() => dispatch({ type: "HIRE", role })}
                  >
                    {hired
                      ? "採用済み"
                      : s.agencyLevel < 2
                        ? "Lv2解放"
                        : "採用"}
                  </button>
                </article>
              );
            },
          )}
        </div>
      </>
    );
  if (panel === "business")
    return (
      <>
        <div className="summary-grid">
          <div>
            <small>今月の売上</small>
            <b>{format(s.monthlyIncome)}G</b>
          </div>
          <div>
            <small>今月の支出</small>
            <b>{format(s.monthlyExpense)}G</b>
          </div>
          <div>
            <small>収支</small>
            <b
              className={
                s.monthlyIncome >= s.monthlyExpense ? "mint-text" : "pink-text"
              }
            >
              {format(s.monthlyIncome - s.monthlyExpense)}G
            </b>
          </div>
          <div>
            <small>総ファン数</small>
            <b>{format(totalFans(s))}人</b>
          </div>
        </div>
        <p className="small muted">
          月末固定費{" "}
          {format(
            15000 +
              s.facilities.length * 1500 +
              s.staff.reduce((n, p) => n + p.salary, 0),
          )}
          G（家賃・施設維持・給与）
          <br />
          ライバー還元の月末精算：{format(s.monthlyRoyalty)}G（配信売上の40%）
        </p>
        <article className="event-banner">
          <span className="eyebrow">MONTHLY EVENT / {s.month}月</span>
          <h3>
            ✦ {s.agencyLevel >= 25 ? "大型 " : ""}
            {EVENTS[s.event.type].name}
          </h3>
          <p>{STYLES[EVENTS[s.event.type].style].name}配信なら得点 ×1.4</p>
          <strong>
            {format(s.event.score)} <small>pt</small>
          </strong>
          <p className="small">
            月末に8つのNPC事務所と結果発表。
            {s.agencyLevel >= 25 ? " 大型大会：NPC強さ×1.8、賞金×2！" : ""}
            <br />
            1位 300,000G / 2位 200,000G / 3位 120,000G / 4〜9位 50,000G
          </p>
          <button
            className="primary"
            disabled={s.agencyLevel < 5 || s.event.joined}
            onClick={() => dispatch({ type: "EVENT" })}
          >
            {s.event.joined
              ? "エントリー済み"
              : s.agencyLevel < 5
                ? "事務所Lv5で解放"
                : "無料でエントリー"}
          </button>
        </article>
        <details>
          <summary>ライバル事務所を見る</summary>
          <p className="small muted">{NPCS.join(" / ")}</p>
        </details>
        <div className="list-row">
          <span>
            広告案件<small>Lv15から月1回 / ファン数で報酬増加</small>
          </span>
          <button
            disabled={s.agencyLevel < 15 || s.stats.contracts >= s.month}
            onClick={() => dispatch({ type: "CONTRACT" })}
          >
            案件を受ける
          </button>
        </div>
        <h3>月次レポート</h3>
        {s.reports.length ? (
          s.reports.map((r) => (
            <details key={r.month}>
              <summary>
                {r.month}月 / 利益 {format(r.profit)}G
              </summary>
              <p>
                売上 {format(r.income)}G / 支出 {format(r.expense)}G
              </p>
              <p>
                ファン +{format(r.fans)} / 前月比 {format(r.comparison)}G
              </p>
              <p>{r.event}</p>
            </details>
          ))
        ) : (
          <p className="empty">
            最初の月末にレポートが届きます。
            <br />
            1日45秒、1か月30日。
          </p>
        )}
      </>
    );
  if (panel === "achievements")
    return (
      <>
        <div className="banner">
          {s.achievements.length} / {ACHIEVEMENTS.length} 達成報酬を受け取り済み
        </div>
        <div className="choice-list">
          {ACHIEVEMENTS.map(([id, title, desc, reward]) => {
            const done = s.achievements.includes(id),
              ready = achievementReady(s, id);
            return (
              <article className={`achievement ${done ? "done" : ""}`} key={id}>
                <span className="medal">
                  <Icon name={done ? "check" : "star"} size={24} />
                </span>
                <div>
                  <h3>{title}</h3>
                  <small className="muted">{desc}</small>
                  <small>+{format(reward)}G</small>
                </div>
                <button
                  disabled={done || !ready}
                  className={ready && !done ? "primary" : ""}
                  onClick={() => dispatch({ type: "CLAIM", id })}
                >
                  {done ? "受取済" : ready ? "受け取る" : "挑戦中"}
                </button>
              </article>
            );
          })}
        </div>
      </>
    );
  if (panel === "news")
    return (
      <div className="choice-list">
        {s.logs.map((l) => (
          <div className="list-row" key={l.id}>
            <span className="small">✧ {l.text}</span>
          </div>
        ))}
      </div>
    );
  if (panel === "missions")
    return (
      <>
        <RequestBoard state={s} dispatch={dispatch} open={open} />
        <h3>事務所の長期目標</h3>
        <div className="banner">
          最初の一歩から、大手事務所まで。
          <br />
          きみと過ごした時間が、いちばんの宝物。
        </div>
        {[
          ["最初の配信を届けよう", s.stats.streams > 0],
          ["新しい仲間をスカウト", s.stats.scouts > 0],
          ["施設を建ててみよう", s.stats.builds > 0],
          ["事務所Lv5を目指そう", s.agencyLevel >= 5],
          ["初めてのイベントへ", s.event.entries > 0],
          ["事務所Lv30・夢の大手へ", s.agencyLevel >= 30],
        ].map(([title, done]) => (
          <div className="list-row" key={String(title)}>
            <span>
              {done ? "✓" : "○"} {title}
            </span>
            <span className={done ? "mint-text" : "muted"}>
              {done ? "達成" : "挑戦中"}
            </span>
          </div>
        ))}
        <button className="primary full" onClick={() => open("achievements")}>
          実績報酬を確認
        </button>
      </>
    );
  if (panel === "more")
    return (
      <div className="choice-list">
        {(
          ["staff", "achievements", "news", "missions", "settings"] as Panel[]
        ).map((key) => (
          <button key={key} onClick={() => open(key)}>
            {PANEL_NAMES[key]}
            <span>→</span>
          </button>
        ))}
      </div>
    );
  if (panel === "settings")
    return (
      <>
        <div className="choice-list">
          {(
            [
              ["sound", "効果音", "ボタン・建設・配信完了の音"],
              ["music", "BGM", "穏やかなオリジナル電子音"],
              ["light", "軽量描画", "吹き出しとアニメーションを簡略化"],
            ] as const
          ).map(([key, title, desc]) => (
            <label className="toggle-row" key={key}>
              <span>
                {title}
                <small>{desc}</small>
              </span>
              <input
                type="checkbox"
                checked={s.settings[key]}
                onChange={(e) =>
                  dispatch({ type: "SETTINGS", key, value: e.target.checked })
                }
              />
            </label>
          ))}
        </div>
        <h3>セーブデータ</h3>
        <p className="small muted">
          このブラウザに自動保存。機種変更前にバックアップを保存してください。オフライン中の時間は進みません。
        </p>
        <button
          className="full"
          disabled={backupBusy}
          onClick={async () => {
            setBackupBusy(true);
            setMessage("");
            try {
              await exportBackup(s);
            } catch {
              setMessage(
                "書き出せませんでした。保存した画像が見つからない場合は選び直し、もう一度お試しください。",
              );
            } finally {
              setBackupBusy(false);
            }
          }}
        >
          {backupBusy
            ? "バックアップを準備しています…"
            : "バックアップを書き出す"}
        </button>
        <p className="small muted">変更したイラストも一緒に書き出します。</p>
        <label className="file-button">
          バックアップを読み込む
          <input
            type="file"
            disabled={backupBusy}
            accept=".json,application/json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              e.target.value = "";
              if (file.size > MAX_BACKUP_BYTES) {
                setMessage("ファイルが大きすぎます。");
                return;
              }
              try {
                setBackupBusy(true);
                const { state: decoded, entries } = await importBackup(
                  await file.text(),
                );
                if (
                  !window.confirm(
                    "現在の進行を、このバックアップに置き換えますか？",
                  )
                )
                  return;
                if (!(await p.restore(decoded, entries))) throw Error("save");
                close();
              } catch {
                setMessage(
                  "読み込めませんでした。星むすびのバックアップファイルを選んでください。",
                );
              } finally {
                setBackupBusy(false);
              }
            }}
          />
        </label>
        {message && (
          <p role="alert" className="warning">
            {message}
          </p>
        )}
        <details>
          <summary>データをリセット</summary>
          <p className="small">
            現在の事務所と進行が消去されます。先にバックアップしてください。
          </p>
          <button
            className="danger"
            onClick={() => {
              if (!confirm) {
                setConfirm(true);
                return;
              }
              p.reset();
              close();
            }}
          >
            {confirm ? "本当に消去して最初から始める" : "リセットを確認"}
          </button>
        </details>
        <p className="legal">
          配信アプリ文化をモチーフにしたオリジナルゲーム。IRIAMおよび関連企業とは関係ありません。登場人物・団体は架空です。
        </p>
      </>
    );
  return (
    <>
      <Meter value={0} />
    </>
  );
}
