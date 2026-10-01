import { useState } from "react";
import type { Action, GameData, Streamer } from "../types.ts";
import { RANKS, STATS, STYLES, format } from "../game/data.ts";
import { Avatar, Icon, Meter } from "./common.tsx";
import { canCustomize } from "../game/customization.ts";
export function StreamerDetail({
  person,
  state,
  dispatch,
  onStream,
  onTrain,
  onCustomize,
  full = false,
}: {
  person: Streamer;
  state: GameData;
  dispatch: (a: Action) => void;
  onStream: () => void;
  onTrain: () => void;
  onCustomize: () => void;
  full?: boolean;
}) {
  const [tab, setTab] = useState("能力");
  const action = person.job?.type;
  return (
    <div className="streamer-detail">
      <div className="detail-label">
        <span>
          <i className="live-dot" /> PICK UP LIVER
        </span>
        <span>✧</span>
      </div>
      <div className="profile-top">
        <Avatar person={person} />
        <div>
          <span className="small muted">{person.nickname}</span>
          <h2>{person.name}</h2>
          <div className="rank-row">
            <b className="rank">{RANKS[person.rankIndex]}</b>
            <span>
              Lv <b>{person.level}</b>
            </span>
          </div>
          <Meter
            value={person.exp}
            max={person.level * 80}
            color="blue"
            label="ライバー経験値"
          />
          <small className="muted">
            EXP {Math.floor(person.exp)} / {person.level * 80}
          </small>
        </div>
      </div>
      <div className="fan-total">
        <span>
          <Icon name="heart" size={17} /> ファン数
        </span>
        <strong>
          {format(person.fanCount)}
          <small> 人</small>
        </strong>
      </div>
      <button
        className={`custom-unlock ${canCustomize(person) ? "unlocked" : ""}`}
        disabled={!canCustomize(person)}
        onClick={onCustomize}
      >
        <b>{canCustomize(person) ? "♡ 私だけの推し" : "🔒 私だけの推し"}</b>
        <small>
          {canCustomize(person)
            ? "名前とイラストを変える →"
            : `解放まで：きみとの絆 ${person.affection} / 40`}
        </small>
      </button>
      <div className="condition">
        <div>
          <span>♡ Mood</span>
          <Meter value={person.mood} label="Mood" />
          <b>{Math.floor(person.mood)}</b>
        </div>
        <div>
          <span>⚡ 疲労</span>
          <Meter
            value={person.fatigue}
            color={person.fatigue >= 70 ? "pink" : "mint"}
            label="疲労"
          />
          <b>{Math.floor(person.fatigue)}</b>
        </div>
      </div>
      {full && (
        <div className="tab-row">
          {["プロフィール", "能力", "活動", "配信履歴", "実績", "好感度"].map(
            (t) => (
              <button
                className={tab === t ? "active" : ""}
                key={t}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ),
          )}
        </div>
      )}
      {(!full || tab === "能力") && (
        <>
          <div className="stat-list">
            {Object.entries(STATS).map(([key, name]) => (
              <div key={key}>
                <span>{name}</span>
                <Meter
                  value={person.stats[key as keyof typeof person.stats]}
                  color="blue"
                  label={name}
                />
                <b>
                  {Math.floor(person.stats[key as keyof typeof person.stats])}
                </b>
              </div>
            ))}
          </div>
          <div className="trait">
            <span>✦ {person.trait}</span>
            <small>{person.description}</small>
          </div>
        </>
      )}
      {full && tab === "プロフィール" && (
        <div className="story">
          <p>{person.bio}</p>
          <p className="muted">
            得意な配信：{STYLES[person.preferredStyle].name} / {person.rarity}
          </p>
          <small>
            レアリティはスタート地点。日々の育成で、誰もがエースになれます。
          </small>
        </div>
      )}
      {full && tab === "配信履歴" && (
        <div className="history">
          {person.history.length ? (
            person.history.map((r) => (
              <div className="list-row" key={r.id}>
                <span>
                  {r.month}月{r.day}日<br />
                  <small>
                    {STYLES[r.style].name} {r.viral ? "🔥" : ""}
                  </small>
                </span>
                <b>
                  +{format(r.fans)} FAN
                  <br />
                  <small>+{format(r.revenue)}G</small>
                </b>
              </div>
            ))
          ) : (
            <p className="empty">
              まだ配信の思い出はありません。
              <br />
              最初の「こんにちは」を届けよう。
            </p>
          )}
        </div>
      )}
      {full && tab === "実績" && (
        <div className="story">
          {person.memories.map((m, i) => (
            <p key={i}>✧ {m}</p>
          ))}
        </div>
      )}
      {full && tab === "好感度" && (
        <div className="story">
          <h3>♡ きみとの絆 {person.affection} / 100</h3>
          <Meter value={person.affection} />
          <p>
            {person.affection >= 80
              ? "「最初は何もできなかった私を、ずっと信じてくれてありがとう。ここで、もっと大きな夢を見たいな。」"
              : person.affection >= 40
                ? "「初配信の前に練習した挨拶、覚えてる？ あの日から、ここが私の居場所になったんだ。」"
                : "「これからよろしくお願いします。私の配信で、誰かを笑顔にできたらいいな。」"}
          </p>
          <small className="muted">
            配信・レッスン・事務所の出来事で絆が深まります。40 /
            80で会話が変化。
          </small>
        </div>
      )}
      {full && tab === "活動" && (
        <div className="story">
          <p>
            得意な配信を1日1回。疲れたら休養する「おまかせ」で、無理なく活動を続けられます。
          </p>
          <p>ランクポイント {person.rankPoints} / 6（−4で降格）</p>
        </div>
      )}
      <div className={`activity ${action === "STREAMING" ? "onair" : ""}`}>
        <span>
          {action === "STREAMING"
            ? "● ON AIR"
            : action === "RESTING"
              ? "☁ 休憩中"
              : action === "TRAINING"
                ? "♫ レッスン中"
                : "✧ 次の配信を考え中"}
        </span>
        {person.job && <small>あと{Math.ceil(person.job.remaining)}秒</small>}
      </div>
      {person.job && (
        <Meter
          value={person.job.total - person.job.remaining}
          max={person.job.total}
        />
      )}
      <button
        className="primary full"
        disabled={!!person.job || person.fatigue >= 100}
        onClick={onStream}
      >
        <Icon name="mic" size={19} /> 配信を指示する
      </button>
      <div className="button-row">
        <button
          disabled={!!person.job}
          onClick={() => dispatch({ type: "REST", id: person.id })}
        >
          ☁ 休憩
        </button>
        <button
          disabled={!!person.job || state.agencyLevel < 3}
          onClick={onTrain}
        >
          ♫ 育成 {state.agencyLevel < 3 ? "Lv3" : ""}
        </button>
      </div>
      <label className="toggle-row">
        <span>
          おまかせ配信<small>1日1回・自動休養</small>
        </span>
        <input
          type="checkbox"
          checked={person.auto}
          onChange={() => dispatch({ type: "AUTO", id: person.id })}
        />
      </label>
    </div>
  );
}
