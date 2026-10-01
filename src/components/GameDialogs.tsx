import { useState } from "react";
import type { FacilityKind, Streamer } from "../types.ts";
import type { useGame } from "../hooks/useGame.ts";
import { exportBackup } from "../game/backup.ts";
import { CustomizationEditor } from "./CustomizationEditor.tsx";
import {
  CHARACTERS,
  STARTER_IDS,
  EVENTS,
  RANDOM_EVENTS,
  STYLES,
  capacity,
  format,
} from "../game/data.ts";
import { Avatar, Count, Modal } from "./common.tsx";
import { StreamerDetail } from "./StreamerDetail.tsx";
import { PANEL_NAMES, Panels } from "./Panels.tsx";
import type { Panel } from "./Panels.tsx";
interface Props {
  game: ReturnType<typeof useGame>;
  person: Streamer;
  panel: Panel | null;
  facilityId: string | null;
  select: (id: string) => void;
  open: (p: Panel) => void;
  close: () => void;
  setSelected: (id: string) => void;
  setBuilding: (kind: FacilityKind | null) => void;
  setGhost: (p: { x: number; y: number } | null) => void;
}
export function GameDialogs({
  game,
  person,
  panel,
  facilityId,
  select,
  open,
  close,
  setSelected,
  setBuilding,
  setGhost,
}: Props) {
  const { state: s, dispatch } = game;
  const result = s.resultQueue[0];
  const [choice, setChoice] = useState("hiyori");
  const [editorBusy, setEditorBusy] = useState(false);
  const [backupError, setBackupError] = useState("");
  return (
    <>
      {" "}
      {game.corrupt ? (
        <Modal
          title="セーブデータを読み込めませんでした"
          eyebrow="SAVE RECOVERY"
        >
          <p>
            保存内容が壊れているか、対応していない形式です。元のデータはまだ上書きしていません。
          </p>
          <button className="primary full" onClick={() => game.reset()}>
            新しいデータで開始する
          </button>
          <p className="small muted">
            以前のバックアップがある場合は、開始後に設定から読み込めます。
          </p>
        </Modal>
      ) : !s.started ? (
        <Modal
          title="最初の夢を、一緒に。"
          eyebrow="WELCOME TO HOSHIMUSUBI"
          wide
        >
          <p className="intro-copy">
            小さな事務所、まだ見ぬステージ。
            <br />
            最初のライバーを選んで、きみだけの物語を始めよう。
          </p>
          <div className="starter-grid">
            {CHARACTERS.filter((c) => STARTER_IDS.includes(c.id)).map((c) => (
              <button
                key={c.id}
                onClick={() => setChoice(c.id)}
                className={`starter-card ${choice === c.id ? "selected" : ""}`}
              >
                <Avatar person={c} large />
                <span className="small muted">{c.nickname}</span>
                <h3>{c.name}</h3>
                <small>{c.description}</small>
                <span className="starter-check">
                  {choice === c.id ? "✓ 一緒にはじめる" : "この子を選ぶ"}
                </span>
              </button>
            ))}
          </div>
          <button
            className="primary start-button"
            onClick={() => {
              setSelected(choice);
              dispatch({ type: "START", id: choice });
            }}
          >
            このライバーと事務所をはじめる <span>→</span>
          </button>
          <p className="legal">
            配信アプリ文化をモチーフにしたオリジナル・非公式ゲーム
          </p>
        </Modal>
      ) : s.gameOver ? (
        <Modal title="この経験が、次の夢につながる。" eyebrow="OFFICE STORY">
          <p>
            経営危機が3か月続きました。{s.month - 1}か月間、{s.streamers.length}
            人のライバーと歩んだ物語を、バックアップに残せます。
          </p>
          <p>次はおまかせ配信を活用し、毎月の固定費を抑えてみましょう。</p>
          <button
            className="full"
            onClick={async () => {
              try {
                await exportBackup(s);
              } catch {
                setBackupError(
                  "画像を含むバックアップを書き出せませんでした。保存した画像を確認してください。",
                );
              }
            }}
          >
            この物語をバックアップ
          </button>
          {backupError && <p role="alert">{backupError}</p>}
          <button
            className="primary full"
            onClick={() => {
              if (
                window.confirm(
                  "この事務所の進行を消去して、新しい物語を始めますか？",
                )
              )
                game.reset();
            }}
          >
            新しい物語を始める
          </button>
        </Modal>
      ) : result ? (
        <Modal
          title={result.viral ? "🔥 VIRAL STREAM !!" : "想い、届いたね。"}
          eyebrow="STREAM RESULT"
        >
          <div className="result-person">
            <Avatar
              person={
                s.streamers.find((c) => c.id === result.streamerId) ?? person
              }
            />
            <h3>
              {s.streamers.find((c) => c.id === result.streamerId)?.name ??
                result.name}
            </h3>
            <span className="muted">
              {STYLES[result.style].name}配信{" "}
              {result.accident ? "・配信トラブルで早めに終了" : ""}
            </span>
          </div>
          <div className="result-fans">
            ＋<Count value={result.fans} />
            <small>FAN</small>
          </div>
          <div className="summary-grid">
            <div>
              <small>売上</small>
              <b>
                ＋<Count value={result.revenue} />G
              </b>
            </div>
            <div>
              <small>獲得EXP</small>
              <b>
                ＋<Count value={result.exp} />
              </b>
            </div>
          </div>
          <p className="result-viewers">
            MAX VIEWERS <b>{format(result.viewers)}</b>
          </p>
          {result.rankUp && (
            <div className="banner">✦ {result.rankUp}ランクに昇格！</div>
          )}
          <button
            className="primary full"
            onClick={() => dispatch({ type: "RESULT_CLOSE" })}
          >
            おつかれさま！ オフィスへ
          </button>
        </Modal>
      ) : s.levelNotice ? (
        <Modal title={`事務所 Lv.${s.levelNotice}`} eyebrow="OFFICE LEVEL UP!">
          <div className="level-celebration">
            ✦<b>{s.levelNotice}</b>✧
          </div>
          <h3 className="center">
            {s.levelNotice === 30
              ? "大手事務所へ。夢は、まだ続く。"
              : [4, 10, 20].includes(s.levelNotice)
                ? "新しいフロアが広がりました！"
                : "また一歩、夢に近づいた。"}
          </h3>
          <div className="banner">
            {s.mapSize}×{s.mapSize}のオフィス / 所属上限{" "}
            {capacity(s.agencyLevel)}人<br />
            {s.levelNotice === 2
              ? "スタッフ採用とカフェが解放！"
              : s.levelNotice === 3
                ? "ライバーのレッスンが解放！"
                : s.levelNotice === 5
                  ? "月間イベントが解放！"
                  : s.levelNotice === 7
                    ? "コラボ配信が解放！"
                    : s.levelNotice === 10
                      ? "グッズコーナーが解放！"
                      : s.levelNotice === 12
                        ? "撮影スタジオが解放！"
                        : s.levelNotice === 15
                          ? "広告案件が解放！"
                          : "日々の活動が、事務所の力になっています。"}
          </div>
          <button
            className="primary full"
            onClick={() => dispatch({ type: "LEVEL_CLOSE" })}
          >
            これからも、一緒に。
          </button>
        </Modal>
      ) : s.reportPending && s.reports[0] ? (
        <Modal
          title={`${s.reports[0].month}月のオフィスレポート`}
          eyebrow="MONTHLY REPORT"
        >
          <h3>
            {s.reports[0].profit >= 0
              ? "今月も、おつかれさま！"
              : "来月は、少しずつ立て直そう。"}
          </h3>
          <div className="summary-grid">
            {[
              ["売上", s.reports[0].income],
              ["支出", s.reports[0].expense],
              ["利益", s.reports[0].profit],
              ["前月比較", s.reports[0].comparison],
            ].map(([label, n]) => (
              <div key={String(label)}>
                <small>{label}</small>
                <b>{format(Number(n))}G</b>
              </div>
            ))}
          </div>
          <p>新しいファン ＋{format(s.reports[0].fans)}人</p>
          <p className="small">{s.reports[0].event}</p>
          {s.reports[0].ranking.slice(0, 5).map((r, i) => (
            <div className="list-row" key={r.name}>
              <span>
                {i + 1}. {r.name}
              </span>
              <b>{format(r.fans)} FAN</b>
            </div>
          ))}
          <button
            className="primary full"
            onClick={() => dispatch({ type: "REPORT_CLOSE" })}
          >
            新しい1か月へ
          </button>
        </Modal>
      ) : s.choice !== null ? (
        <Modal title={RANDOM_EVENTS[s.choice]} eyebrow="A LITTLE OFFICE STORY">
          <p>
            事務所のみんなから提案です。少し予算を使って、いつもと違う一日にしてみませんか？
          </p>
          <div className="banner">
            みんなのMood +15 / 好感度 +3 / 事務所EXP +20
          </div>
          <button
            className="primary full"
            disabled={s.money < 8000}
            onClick={() => dispatch({ type: "CHOICE", paid: true })}
          >
            みんなで取り組む 8,000G
          </button>
          <button
            className="full"
            onClick={() => dispatch({ type: "CHOICE", paid: false })}
          >
            今日はいつものペースで（無料・Mood +3）
          </button>
        </Modal>
      ) : (
        panel && (
          <Modal
            title={PANEL_NAMES[panel]}
            eyebrow={
              panel === "business"
                ? EVENTS[s.event.type].name
                : "HOSHIMUSUBI PRODUCTION"
            }
            onClose={panel === "customize" && editorBusy ? undefined : close}
            fullScreen={panel === "customize"}
            wide={[
              "livers",
              "build",
              "business",
              "achievements",
              "staff",
              "customize",
            ].includes(panel)}
          >
            {panel === "customize" ? (
              <CustomizationEditor
                key={person.id}
                person={person}
                save={game.customize}
                close={close}
                onBusy={setEditorBusy}
              />
            ) : panel === "detail" ? (
              <StreamerDetail
                person={person}
                state={s}
                dispatch={dispatch}
                onStream={() => open("stream")}
                onTrain={() => open("train")}
                onCustomize={() => open("customize")}
                full
              />
            ) : (
              <Panels
                key={panel}
                panel={panel}
                state={s}
                person={person}
                dispatch={dispatch}
                select={select}
                open={open}
                close={close}
                facilityId={facilityId}
                reset={game.reset}
                restore={game.restore}
                build={(kind) => {
                  close();
                  setBuilding(kind);
                  setGhost(null);
                }}
              />
            )}
          </Modal>
        )
      )}
    </>
  );
}
