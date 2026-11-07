import { fabCard, type FabCard, type FabPitch } from "@/data/fab";

const SEARCH = "https://api.cardvault.fabtcg.com/carddb/api/v1/advanced-search/";
const DETAIL = "https://api.cardvault.fabtcg.com/carddb/api/v1/card_id/";

type Face = {
  printed_name?: string;
  printed_pitch?: number | null;
  printed_cost?: string;
  printed_power?: string;
  printed_defense?: string;
  printed_typebox?: string;
  printed_rules_text?: string;
  image?: { normal?: string; small?: string };
};

type SearchHit = {
  card_id?: string;
  print_language?: string;
  printed_name?: string;
  printed_pitch?: number | null;
  printed_cost?: string;
  printed_power?: string;
  printed_defense?: string;
  printed_typebox?: string;
  printed_rules_text?: string;
  faces?: Face[];
};

export function pitchOf(value: number | null | undefined): FabPitch {
  if (value === 1) return "red";
  if (value === 2) return "yellow";
  if (value === 3) return "blue";
  return "";
}

export function vaultRouteId(cardId: string, pitch: FabPitch): string {
  return `vault~${cardId}~${pitch || "base"}`;
}

export function parseVaultRoute(id: string): { cardId: string; pitch: FabPitch } | null {
  if (!id.startsWith("vault~")) return null;
  const [, cardId, pitch] = id.split("~");
  if (!cardId) return null;
  const clean = pitch === "red" || pitch === "yellow" || pitch === "blue" ? pitch : "";
  return { cardId, pitch: clean };
}

function fromHit(hit: SearchHit): FabCard | null {
  const name = hit.printed_name?.trim();
  if (!name || !hit.card_id) return null;
  const pitch = pitchOf(hit.printed_pitch);
  const local = fabCard(name, pitch);
  const image = hit.faces?.[0]?.image?.normal || hit.faces?.[0]?.image?.small || local?.image || "";
  return {
    id: local?.id ?? vaultRouteId(hit.card_id, pitch),
    name,
    pitch,
    cost: String(hit.printed_cost ?? local?.cost ?? ""),
    power: String(hit.printed_power ?? local?.power ?? ""),
    defense: String(hit.printed_defense ?? local?.defense ?? ""),
    type: hit.printed_typebox || local?.type || "",
    text: (hit.printed_rules_text || local?.text || "").replaceAll("{br}", "\n"),
    image,
  };
}

export async function searchCardVault(query: string, signal?: AbortSignal): Promise<FabCard[]> {
  const url = `${SEARCH}?q=${encodeURIComponent(query)}&page_size=24&orderby=name`;
  const response = await fetch(url, { signal, headers: { accept: "application/json" } });
  if (!response.ok) return [];
  const data = (await response.json()) as { results?: SearchHit[] };
  const cards = (data.results ?? []).map(fromHit).filter((card): card is FabCard => card != null);
  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = `${card.name}|${card.pitch}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function loadVaultCard(cardId: string, pitch: FabPitch): Promise<FabCard | null> {
  const response = await fetch(`${DETAIL}${encodeURIComponent(cardId)}/`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) return null;
  const data = (await response.json()) as {
    results?: Array<{ card_prints?: Array<{ print_language?: string; is_default?: boolean; faces?: Face[] }> }>;
  };
  const prints = data.results?.[0]?.card_prints ?? [];
  const english = prints.filter((print) => print.print_language === "en" && print.faces?.length);
  const pool = english.length ? english : prints;
  const match =
    pool.find((print) => pitchOf(print.faces?.[0]?.printed_pitch) === pitch) ??
    pool.find((print) => print.is_default) ??
    pool[0];
  const face = match?.faces?.[0];
  if (!face?.printed_name) return null;
  return fromHit({
    card_id: cardId,
    printed_name: face.printed_name,
    printed_pitch: face.printed_pitch,
    printed_cost: face.printed_cost,
    printed_power: face.printed_power,
    printed_defense: face.printed_defense,
    printed_typebox: face.printed_typebox,
    printed_rules_text: face.printed_rules_text,
    faces: [face],
  });
}
