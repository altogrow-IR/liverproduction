import { GameDialogs } from "./components/GameDialogs.tsx";
import { requestGoals, requestReady } from "./game/requests.ts";
import { useCallback, useEffect, useState } from "react";
import type { FacilityKind } from "./types.ts";
import {
  ACHIEVEMENTS,
  BRAND,
  CHARACTERS,
  FACILITIES,
  SLOTS,
  capacity,
  compact,
  neededExp,
  staffCapacity,
} from "./game/data.ts";
import {
  achievementReady,
  canPlace,
  createStreamer,
  totalFans,
} from "./game/engine.ts";
import { startMusic } from "./game/music.ts";
import { useGame } from "./hooks/useGame.ts";
import { OfficeCanvas } from "./components/OfficeCanvas.tsx";
import { Avatar, Icon, Meter } from "./components/common.tsx";
import { StreamerDetail } from "./components/StreamerDetail.tsx";
import { PANEL_NAMES } from "./components/Panels.tsx";
import type { Panel } from "./components/Panels.tsx";
const NAV: [string, string, Panel | null][] = [
  ["home", "ホーム", null],
  ["people", "ライバー", "livers"],
  ["mic", "配信", "stream"],
  ["build", "建設", "build"],
  ["people", "スタッフ", "staff"],
  ["chart", "経営", "business"],
  ["star", "実績", "achievements"],
  ["settings", "設定", "settings"],
  ["more", "その他", "more"],
];
export default function App() {
  const game = useGame();
  const { state: s, dispatch } = game;
  const [panel, setPanel] = useState<Panel | null>(null);
  const [selected, setSelected] = useState("hiyori");
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [building, setBuilding] = useState<FacilityKind | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);

  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const person =
    s.streamers.find((c) => c.id === selected) ??
    s.streamers[0] ??
    createStreamer(CHARACTERS[0]);
  const slot = SLOTS[Math.min(4, Math.floor(s.seconds / 9))];
  const result = s.resultQueue[0];
  const globalModal =
    game.corrupt ||
    !s.started ||
    !!result ||
    s.reportPending ||
    s.levelNotice !== null ||
    s.choice !== null ||
    s.gameOver;
  const paused = !!panel || globalModal || !!building || !game.speed;
  useEffect(() => {
    game.setPaused(paused);
  }, [paused, game.setPaused]);
  useEffect(() => {
    if (!s.settings.music) return;
    return startMusic();
  }, [s.settings.music]);
  const lastLog = s.logs[0];
  useEffect(() => {
    if (!lastLog || lastLog.id === 0) return;
    setToasts((t) => [...t, lastLog].slice(-3));
    setTimeout(
      () => setToasts((t) => t.filter((x) => x.id !== lastLog.id)),
      4500,
    );
  }, [lastLog?.id]);
  const open = (p: Panel) => {
    setPanel(p);
    setBuilding(null);
    setGhost(null);
  };
  const close = useCallback(() => setPanel(null), []);
  const select = (id: string) => {
    if (id.startsWith("facility:")) setFacilityId(id.slice(9));
    else setSelected(id);
  };
  const ready = ACHIEVEMENTS.filter(
    ([id]) => !s.achievements.includes(id) && achievementReady(s, id),
  ).length;
  const tutorial =
    s.stats.streams === 0
      ? {
          label: "最初の配信を届けよう",
          desc: "みんなの夢は、ここから。",
          panel: "stream" as Panel,
        }
      : {
          label: requestReady(s)
            ? `お願い達成！ 報酬を${requestReady(s)}件受け取れます`
            : s.requests.claimed.length === 3
              ? "ファンからのお便りが届きました"
              : "ファンからのお願いに挑戦しよう",
          desc: `${requestGoals(s).filter((g) => g.value >= g.target).length}/3 達成 · 期限なしで、少しずつ。`,
          panel: "missions" as Panel,
        };
  return (
    <div className="app">
      <header className="topbar">
        <button
          className="brand"
          onClick={() => {
            close();
            setBuilding(null);
          }}
          aria-label="ホーム"
        >
          <span className="brand-star">✦</span>
          <span>
            <b>
              {BRAND.name}
              <em>{BRAND.suffix}</em>
            </b>
            <small>LIVER AGENCY SIMULATION</small>
          </span>
        </button>
        <div className="hud">
          <div className="hud-money">
            <span className="coin-symbol">G</span>
            <div>
              <small>所持金</small>
              <strong className={s.money < 0 ? "pink-text" : ""}>
                {compact(s.money)}
                <em> G</em>
              </strong>
            </div>
          </div>
          <div className="hud-level">
            <div>
              <small>事務所レベル</small>
              <strong>
                <em>Lv.</em> {s.agencyLevel}
              </strong>
            </div>
            <div className="hud-exp">
              <Meter
                value={s.agencyExp}
                max={neededExp(s.agencyLevel)}
                color="mint"
                label="事務所経験値"
              />
              <small>
                {s.agencyExp} / {neededExp(s.agencyLevel)}
              </small>
            </div>
          </div>
          <div className="hud-members">
            <Icon name="people" />
            <div>
              <small>ライバー / スタッフ</small>
              <b>
                {s.streamers.length}/{capacity(s.agencyLevel)} <span>・</span>{" "}
                {s.staff.length}/{staffCapacity(s.agencyLevel)}
              </b>
            </div>
          </div>
          <div className="hud-date">
            <small>{s.month}か月目</small>
            <b>
              {s.day}日目{" "}
              <span>
                {slot.icon} {slot.name}
              </span>
            </b>
          </div>
        </div>
        <div className="speed-controls" aria-label="ゲーム速度">
          {[0, 1, 2, 4].map((v) => (
            <button
              key={v}
              className={game.speed === v ? "active" : ""}
              aria-label={v ? `速度${v}倍` : "一時停止"}
              aria-pressed={game.speed === v}
              onClick={() => game.setSpeed(v)}
            >
              {v ? `×${v}` : <Icon name="pause" size={15} />}
            </button>
          ))}
        </div>
      </header>
      <main className="game-layout">
        <aside className="left-rail">
          {(["news", "missions", "achievements", "settings"] as Panel[]).map(
            (p, i) => (
              <button
                key={p}
                onClick={() => open(p)}
                aria-label={PANEL_NAMES[p]}
              >
                <Icon name={["bell", "chart", "star", "settings"][i]} />
                <small>{["お知らせ", "ミッション", "実績", "設定"][i]}</small>
                {p === "achievements" && ready > 0 && (
                  <b className="badge">{ready}</b>
                )}
              </button>
            ),
          )}
          <span className="rail-caption">
            MAKE A LITTLE
            <br />
            DREAM BIG.
          </span>
        </aside>
        <section className="office" aria-label="オフィス">
          <div className="office-heading">
            <div>
              <span className="eyebrow">OUR LITTLE OFFICE</span>
              <h1>夢が集まる、この場所で。</h1>
            </div>
            <span className="office-size">
              {s.mapSize} × {s.mapSize}
              <small>
                {s.agencyLevel >= 20
                  ? "大きくなった、私たちの事務所"
                  : s.agencyLevel >= 4
                    ? "夢が広がるオフィス"
                    : "はじまりのオフィス"}
              </small>
            </span>
          </div>
          <div className="ambient-circle circle-one" />
          <div className="ambient-circle circle-two" />
          <div className="map-stage">
            <OfficeCanvas
              state={s}
              selected={person.id}
              onSelect={(id) => {
                setSelected(id);
                if (innerWidth < 1050) open("detail");
              }}
              onFacility={(id) => {
                setFacilityId(id);
                open("facility");
              }}
              building={building}
              ghost={ghost}
              onGhost={setGhost}
              paused={paused}
              speed={game.speed}
            />
          </div>
          {!building && (
            <>
              <button
                className={`mission-card ${s.tutorial < 4 ? "tutorial-highlight" : ""}`}
                onClick={() => open(tutorial.panel)}
              >
                <span className="mission-icon">✧</span>
                <span>
                  <small>NEXT STEP</small>
                  <b>{tutorial.label}</b>
                  <em>{tutorial.desc}</em>
                </span>
                <span>→</span>
              </button>
              <div className="office-meta">
                <span className="save-dot" />{" "}
                {game.saveError
                  ? "保存に失敗・設定から書き出しを"
                  : "オートセーブ"}
                <span>ドラッグで移動 · ピンチで拡大</span>
              </div>
              <div className="recent-card">
                <span className="eyebrow">OFFICE DIARY</span>
                {s.logs.slice(0, 3).map((l) => (
                  <p key={l.id}>
                    <span>✦</span>
                    {l.text}
                  </p>
                ))}
              </div>
              <div className="map-foot">
                <span>
                  ☁{" "}
                  {
                    s.streamers.filter((c) => c.job?.type === "STREAMING")
                      .length
                  }
                  人が配信中
                </span>
                <span>♡ {compact(totalFans(s))} FAN</span>
              </div>
            </>
          )}
          {building && (
            <div className="build-toolbar">
              <div>
                <span className="eyebrow">BUILD MODE</span>
                <b>{FACILITIES.find((d) => d.kind === building)!.name}</b>
                <small>
                  {ghost
                    ? `配置 ${ghost.x}, ${ghost.y}`
                    : "空いている床をタップ"}{" "}
                  · 2×2マス
                </small>
              </div>
              <div className="button-row">
                <button
                  onClick={() => {
                    setBuilding(null);
                    setGhost(null);
                  }}
                >
                  キャンセル
                </button>
                <button
                  className="primary"
                  disabled={
                    !ghost ||
                    !canPlace(s, ghost.x, ghost.y) ||
                    s.money < FACILITIES.find((f) => f.kind === building)!.price
                  }
                  onClick={() => {
                    if (ghost)
                      dispatch({ type: "BUILD", kind: building, ...ghost });
                    setBuilding(null);
                    setGhost(null);
                  }}
                >
                  建設を確定
                </button>
              </div>
            </div>
          )}
        </section>
        <aside className="right-panel">
          <StreamerDetail
            person={person}
            state={s}
            dispatch={dispatch}
            onStream={() => open("stream")}
            onTrain={() => open("train")}
            onCustomize={() => open("customize")}
          />
          <button className="text-button full" onClick={() => open("detail")}>
            プロフィール・配信履歴を見る →
          </button>
        </aside>
      </main>
      <button className="mobile-selected" onClick={() => open("detail")}>
        <Avatar person={person} />
        <span>
          <b>{person.name}</b>
          <small>
            {person.job?.type === "STREAMING"
              ? "● 配信中"
              : person.job?.type === "RESTING"
                ? "☁ 休憩中"
                : person.job
                  ? "♫ レッスン中"
                  : "✧ 次の配信を考え中"}
          </small>
        </span>
        <span className="mobile-fans">♡ {compact(person.fanCount)}</span>
        <span>›</span>
      </button>
      <nav className="bottom-nav" aria-label="メインナビゲーション">
        {NAV.map(([icon, label, p]) => (
          <button
            key={label}
            className={`${panel === p && !building ? "active" : ""} nav-${p ?? "home"}`}
            onClick={() => {
              if (p) open(p);
              else {
                close();
                setBuilding(null);
              }
            }}
          >
            <Icon name={icon} />
            <span>{label}</span>
            {p === "achievements" && ready > 0 && <i className="tiny-dot" />}
          </button>
        ))}
      </nav>
      <div className="toast-stack" aria-live="polite">
        {panel !== "missions" &&
          toasts.map((t) => (
            <div className="toast" key={t.id}>
              ✦ {t.text}
            </div>
          ))}
      </div>
      {s.money < 0 && !globalModal && (
        <div className="crisis-banner">
          経営危機：{s.crisisMonths} / 3か月。配信で収支を立て直そう。
        </div>
      )}
      <GameDialogs
        game={game}
        person={person}
        panel={panel}
        facilityId={facilityId}
        select={select}
        open={open}
        close={close}
        setSelected={setSelected}
        setBuilding={setBuilding}
        setGhost={setGhost}
      />
    </div>
  );
}
