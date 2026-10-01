export type Style = "TALK" | "SING" | "PROJECT" | "ENDURANCE" | "COLLAB";
export type Stat =
  | "talk"
  | "sing"
  | "project"
  | "fanService"
  | "mental"
  | "endurance"
  | "popularity";
export type Rarity = "N" | "R" | "SR" | "SSR";
export type Role = "MANAGER" | "SCOUT" | "TRAINER" | "PROMOTER" | "DESIGNER";
export type FacilityKind =
  | "booth"
  | "sing"
  | "talk"
  | "project"
  | "rest"
  | "cafe"
  | "manager"
  | "scout"
  | "goods"
  | "studio"
  | "reception"
  | "desk";
export interface CharacterDef {
  id: string;
  gender?: "male";
  name: string;
  nickname: string;
  rarity: Rarity;
  color: string;
  preferredStyle: Style;
  trait: string;
  description: string;
  stats: Record<Stat, number>;
  bio: string;
}
export interface StreamResult {
  id: string;
  streamerId: string;
  name: string;
  day: number;
  month: number;
  style: Style;
  fans: number;
  revenue: number;
  exp: number;
  viewers: number;
  viral: boolean;
  accident: boolean;
  rankUp: string | null;
}
export interface Job {
  type: "STREAMING" | "TRAINING" | "RESTING";
  remaining: number;
  total: number;
  facilityId: string;
  style?: Style;
  stat?: Stat;
  partnerId?: string;
}
export interface Streamer extends CharacterDef {
  customization: Customization;
  level: number;
  exp: number;
  fanCount: number;
  mood: number;
  fatigue: number;
  affection: number;
  rankIndex: number;
  rankPoints: number;
  history: StreamResult[];
  memories: string[];
  job: Job | null;
  auto: boolean;
  lastAutoDay: number;
}
export interface Customization {
  unlocked: boolean;
  displayName: string | null;
  portraitId: string | null;
  miniId: string | null;
  miniMode: "badge" | "figure";
  miniUsesPortrait: boolean;
}
export interface Facility {
  id: string;
  kind: FacilityKind;
  x: number;
  y: number;
  level: number;
}
export interface FacilityDef {
  kind: FacilityKind;
  name: string;
  short: string;
  icon: string;
  color: string;
  price: number;
  unlock: number;
  description: string;
}
export interface Staff {
  id: string;
  name: string;
  role: Role;
  level: number;
  salary: number;
  bonusValue: number;
}
export interface MonthReport {
  month: number;
  income: number;
  expense: number;
  profit: number;
  fans: number;
  comparison: number;
  ranking: { name: string; fans: number }[];
  event: string;
}
export interface GameData {
  version: 2;
  started: boolean;
  money: number;
  agencyLevel: number;
  agencyExp: number;
  day: number;
  month: number;
  seconds: number;
  streamers: Streamer[];
  staff: Staff[];
  facilities: Facility[];
  mapSize: number;
  candidates: string[];
  freeRefreshDay: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyRoyalty: number;
  monthlyFans: number;
  reports: MonthReport[];
  resultQueue: StreamResult[];
  reportPending: boolean;
  levelNotice: number | null;
  event: {
    joined: boolean;
    large: boolean;
    type: number;
    score: number;
    lastResult: string;
    wins: number;
    entries: number;
  };
  choice: number | null;
  achievements: string[];
  logs: { id: number; text: string }[];
  tutorial: number;
  stats: {
    streams: number;
    scouts: number;
    builds: number;
    training: number;
    viral: number;
    revenue: number;
    maxMonthly: number;
    months: number;
    contracts: number;
  };
  crisisMonths: number;
  gameOver: boolean;
  milestone: boolean;
  settings: { sound: boolean; music: boolean; light: boolean };
  seed: number;
  requests: {
    round: number;
    streams: number;
    themed: number;
    rests: number;
    claimed: string[];
  };
}
export type Action =
  | { type: "CUSTOMIZE"; id: string; customization: Customization }
  | { type: "REQUEST_CLAIM"; id: string; round: number }
  | { type: "REQUEST_NEXT"; round: number }
  | { type: "START"; id: string }
  | { type: "TICK"; delta: number }
  | {
      type: "STREAM";
      id: string;
      style: Style;
      partnerId?: string;
      force?: boolean;
    }
  | { type: "TRAIN"; id: string; stat: Stat }
  | { type: "REST"; id: string }
  | { type: "AUTO"; id: string }
  | { type: "SCOUT"; id: string }
  | { type: "REFRESH" }
  | { type: "BUILD"; kind: FacilityKind; x: number; y: number }
  | { type: "UPGRADE"; id: string }
  | { type: "HIRE"; role: Role }
  | { type: "EVENT" }
  | { type: "CHOICE"; paid: boolean }
  | { type: "CLAIM"; id: string }
  | { type: "CONTRACT" }
  | { type: "RESULT_CLOSE" }
  | { type: "REPORT_CLOSE" }
  | { type: "LEVEL_CLOSE" }
  | { type: "SETTINGS"; key: "sound" | "music" | "light"; value: boolean };
