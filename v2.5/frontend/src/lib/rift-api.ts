export type ApiDeck = {
  id: number;
  name: string;
  player_name: string | null;
  legend: string | null;
  rank_label: string | null;
  record: string | null;
  price_usd: number | null;
  meta: string | null;
  event_date: string | null;
  source_url: string;
  tournament_id: number | null;
  placement: number | null;
  card_count: number | null;
};

export type ApiDeckCard = {
  section: string;
  card_name: string;
  quantity: number;
  price_usd: number | null;
  card_id: string | null;
  image_url?: string | null;
};

export type ApiDeckDetail = ApiDeck & { cards: ApiDeckCard[] };

export type ApiLegend = {
  legend: string;
  meta_share_pct: number | null;
  total_decks: number | null;
  top8_count: number | null;
  avg_price_usd: number | null;
  tier: string | null;
  win_rate_pct?: number | null;
};

export type ApiSync = {
  finished_at: string | null;
  source: string;
  status: string;
};

export type ApiStats = {
  cards: number;
  decks: number;
  tournaments: number;
  last_sync: ApiSync | null;
};

export type ApiTournament = {
  id: number;
  name: string;
  host: string | null;
  country: string | null;
  event_date: string | null;
  player_count: number | null;
  meta: string | null;
};

import desk from "@/data/offline-desk.json";

const BASE = "/rift-api";

function offlineGet<T>(path: string): T | null {
  const url = new URL(path, "http://riftbook.local");
  if (url.pathname === "/api/v1/meta/legends") return desk.legends as T;
  if (url.pathname === "/api/v1/stats") return desk.stats as T;
  if (url.pathname === "/api/v1/decks") {
    const limit = Number(url.searchParams.get("limit") ?? "20");
    return desk.decks.slice(0, Number.isFinite(limit) ? limit : 20) as T;
  }
  const match = url.pathname.match(/^\/api\/v1\/decks\/(\d+)$/);
  if (match) return (desk.details[match[1] as keyof typeof desk.details] ?? null) as T | null;
  return null;
}

export async function riftGet<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${BASE}${path}`, { headers: { accept: "application/json" } });
    if (response.ok) {
      const data = (await response.json()) as T;
      if (data && typeof data === "object") return data;
    }
  } catch {
    // The phone build has no desk server. The saved Radiance snapshot is the fallback.
  }
  return offlineGet<T>(path);
}
