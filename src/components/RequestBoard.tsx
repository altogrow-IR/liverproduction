import type { Action, GameData } from "../types.ts";
import { requestGoals, requestTheme } from "../game/requests.ts";
import { STYLES } from "../game/data.ts";
import { Meter } from "./common.tsx";

export function RequestBoard({
  state: s,
  dispatch,
  open,
}: {
  state: GameData;
  dispatch: (a: Action) => void;
  open: (panel: "stream" | "detail") => void;
}) {
  const theme = requestTheme(s);
  const finished = s.requests.claimed.length === 3;
  return (
    <section className="request-board" aria-label="ファンからのお願い">
      <div className="request-intro">
        <span className="eyebrow">FAN LETTER / {s.requests.round}</span>
        <h3>ファンからのお願い</h3>
        <p>小さな応援に、あなたらしい配信でお返しを。</p>
        <small>
          期限なし・全員で協力 / おすすめ：{STYLES[theme.style].name}配信
        </small>
      </div>
      {requestGoals(s).map((g) => {
        const claimed = s.requests.claimed.includes(g.id);
        const ready = g.value >= g.target;
        return (
          <article
            className={`request-goal ${claimed ? "done" : ""}`}
            key={g.id}
          >
            <div className="request-heading">
              <h3>
                {claimed ? "✓ " : "✧ "}
                {g.title}
              </h3>
              <b>
                {g.value}/{g.target}
              </b>
            </div>
            <p>{g.detail}</p>
            <Meter
              value={g.value}
              max={g.target}
              label={g.title}
              color="mint"
            />
            <div className="request-footer">
              <small>+{g.reward.toLocaleString()}G / 事務所EXP +10</small>
              <button
                className={ready && !claimed ? "primary" : ""}
                disabled={claimed}
                aria-label={
                  claimed
                    ? `${g.title} 受取済み`
                    : ready
                      ? `${g.title}の報酬を受け取る`
                      : `${g.title}に挑戦`
                }
                onClick={() =>
                  ready
                    ? dispatch({
                        type: "REQUEST_CLAIM",
                        id: g.id,
                        round: s.requests.round,
                      })
                    : open(g.destination)
                }
              >
                {claimed ? "受取済み" : ready ? "報酬を受け取る" : "挑戦する →"}
              </button>
            </div>
          </article>
        );
      })}
      {finished && (
        <div className="request-letter">
          <h3>♡ 応援してくれるみんなより</h3>
          <p>「{theme.letter}」</p>
          <button
            className="primary full"
            onClick={() =>
              dispatch({ type: "REQUEST_NEXT", round: s.requests.round })
            }
          >
            次のお願いを開く
          </button>
        </div>
      )}
    </section>
  );
}
