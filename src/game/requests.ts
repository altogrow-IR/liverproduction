import type { GameData, Style } from "../types.ts";

export const REQUEST_THEMES: { style: Style; title: string; letter: string }[] =
  [
    {
      style: "TALK",
      title: "いつもの声を届けて",
      letter:
        "何気ないおしゃべりに、今日も元気をもらいました。また遊びに来るね！",
    },
    {
      style: "SING",
      title: "小さな歌の贈りもの",
      letter:
        "帰り道に、あの歌を口ずさんでいました。次のステージも楽しみにしています。",
    },
    {
      style: "PROJECT",
      title: "みんなで笑う企画の日",
      letter:
        "画面の前で思わず笑っちゃった！ 一緒に参加できた気持ちになれてうれしかったです。",
    },
  ];
export const newRequests = (round = 1): GameData["requests"] => ({
  round,
  streams: 0,
  themed: 0,
  rests: 0,
  claimed: [],
});
export const requestTheme = (s: GameData) =>
  REQUEST_THEMES[(s.requests.round - 1) % REQUEST_THEMES.length];
export function requestGoals(s: GameData) {
  return [
    {
      id: "streams",
      title: "ふたつの配信を届けよう",
      detail: "どのスタイルでもOK。おまかせ配信も対象。",
      value: s.requests.streams,
      target: 2,
      reward: 3000,
      destination: "stream",
    },
    {
      id: "themed",
      title: requestTheme(s).title,
      detail: "今回のおすすめスタイルで1回配信しよう。",
      value: s.requests.themed,
      target: 1,
      reward: 2000,
      destination: "stream",
    },
    {
      id: "rests",
      title: "がんばった仲間にひと休み",
      detail: "疲労のあるライバーの休憩を1回完了しよう。",
      value: s.requests.rests,
      target: 1,
      reward: 1500,
      destination: "detail",
    },
  ] as const;
}
export const requestReady = (s: GameData) =>
  requestGoals(s).filter(
    (g) => g.value >= g.target && !s.requests.claimed.includes(g.id),
  ).length;
