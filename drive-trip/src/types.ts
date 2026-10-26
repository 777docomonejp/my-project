// 旅行データの型。共有時のマージのため、全レコードに id と updatedAt(ms) を持たせる。

export type Pref = "埼玉" | "東京" | "群馬" | "栃木" | "千葉" | "茨城" | "神奈川" | "静岡" | "山梨";
export const PREFS: Pref[] = ["埼玉", "東京", "群馬", "栃木", "千葉", "茨城", "神奈川", "静岡", "山梨"];

export type Genre = "神社・寺" | "街歩き" | "自然・絶景" | "温泉" | "博物館・施設" | "公園・花" | "グルメ" | "夜景・イルミ" | "サウナ" | "居酒屋" | "ちゃんこ";
export const GENRES: Genre[] = ["神社・寺", "街歩き", "自然・絶景", "温泉", "博物館・施設", "公園・花", "グルメ", "夜景・イルミ", "サウナ", "居酒屋", "ちゃんこ"];

export interface Spot {
  id: string;
  name: string;
  pref: Pref;
  address: string;
  genre: Genre;
  description: string;
  fee: string;
  url?: string;
  lat: number;
  lng: number;
  /** 戸田市から車で何分か（渋滞なしの目安） */
  driveMin?: number;
  /** 座標の確認状況。同梱データは公開地図での目視確認が未了のため "approx"。 */
  coord: "approx" | "verified";
  /** ユーザーが追加した観光地 */
  custom?: boolean;
  updatedAt?: number;
}

export interface Rec {
  id: string;
  updatedAt: number;
}

export interface Member extends Rec {
  name: string;
}

export type BookingStatus = "未予約" | "予約済み" | "キャンセル" | "未確認";

export interface Hotel extends Rec {
  chain: string;
  name: string;
  address: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string;
  status: BookingStatus;
  price: number;
  priceConfirmed: boolean;
  url: string;
  notes: string;
}

export type SpotStatus = "want" | "hold" | "no";

export interface SpotState extends Rec {
  // id = spotId
  status: SpotStatus | null;
  favorite: boolean;
}

export interface ItineraryItem extends Rec {
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string; // HH:MM
  title: string;
  spotId?: string;
  travelMin: number;
  order: number;
  rainAlt: string;
  notes: string;
}

export type Leg = "outbound" | "return" | "local" | "other";
export const LEG_LABEL: Record<Leg, string> = { outbound: "往路", return: "復路", local: "現地移動", other: "その他" };

export type CostCategory = "fuel" | "toll" | "parking" | "hotel" | "food" | "admission" | "other";
export const CATEGORY_LABEL: Record<CostCategory, string> = {
  fuel: "ガソリン",
  toll: "高速料金",
  parking: "駐車料金",
  hotel: "宿泊",
  food: "食事",
  admission: "入場料",
  other: "その他",
};

export interface CostItem extends Rec {
  category: CostCategory;
  leg: Leg;
  label: string;
  /** category=fuel 以外で使う金額（円） */
  amount: number;
  /** ガソリン用 */
  distanceKm?: number;
  kmPerL?: number;
  yenPerL?: number;
  /** 確認済み料金か概算か */
  confirmed: boolean;
  /** 支払った（立て替えた）人 */
  payerId: string;
  /** 負担する人。空なら全員 */
  splitAmong: string[];
  note: string;
}

export interface Message extends Rec {
  authorId: string;
  spotId?: string;
  text: string;
  createdAt: number;
}

export type VoteValue = "yes" | "no" | "hold";

export interface Vote extends Rec {
  // id = `${spotId}__${memberId}`
  spotId: string;
  memberId: string;
  value: VoteValue;
}

export interface TripMeta extends Rec {
  title: string;
  departure: string; // 自由記述（例: 2026-12-25 深夜）
  startDate: string;
  endDate: string;
  origin: string;
  meetPoint: string;
  car: string;
  notes: string;
}

export interface Tombstone {
  id: string; // `${collection}:${recordId}`
  deletedAt: number;
}

export interface Trip {
  schema: 1;
  tripId: string;
  meta: TripMeta;
  members: Member[];
  hotels: Hotel[];
  spotStates: SpotState[];
  customSpots: (Spot & Rec)[];
  itinerary: ItineraryItem[];
  costs: CostItem[];
  messages: Message[];
  votes: Vote[];
  tombstones: Tombstone[];
}

export type Collection = "members" | "hotels" | "spotStates" | "customSpots" | "itinerary" | "costs" | "messages" | "votes";
export const COLLECTIONS: Collection[] = ["members", "hotels", "spotStates", "customSpots", "itinerary", "costs", "messages", "votes"];
