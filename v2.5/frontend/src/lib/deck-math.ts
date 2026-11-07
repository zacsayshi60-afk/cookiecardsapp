import {
  BATTLEFIELDS,
  CARD_BY_ID,
  DOMAINS,
  type Card,
  type Domain,
  legendById,
} from "@/data/catalog";

export const MAIN_SIZE = 40;
export const RUNE_SIZE = 12;
export const COPY_CAP = 3;
export const SIDE_CAP = 10;
export const BATTLEFIELD_COUNT = 3;
export const SIGNATURE_CAP = 3;

export type DeckLike = {
  legendId: string;
  chosenId: string | null;
  main: Record<string, number>;
  side: Record<string, number>;
  runes: Record<Domain, number>;
  battlefields: string[];
};

export type Issue = { tone: "bad" | "warn"; text: string };

export type Analysis = {
  legend: Card | null;
  issues: Issue[];
  mainCount: number;
  sideCount: number;
  runeCount: number;
  curve: { cost: string; count: number }[];
  types: { name: string; count: number }[];
  pips: { domain: Domain; pips: number }[];
  suggested: Record<Domain, number>;
  keywords: { name: string; count: number }[];
  early: number;
  avgEnergy: number;
  avgMight: number;
  unitCount: number;
  legal: boolean;
};

export function emptyRunes(): Record<Domain, number> {
  return { Fury: 0, Calm: 0, Mind: 0, Body: 0, Chaos: 0, Order: 0 };
}

export function countMap(map: Record<string, number>): number {
  return Object.values(map).reduce((sum, n) => sum + n, 0);
}

export function inIdentity(card: Card, legend: Card): boolean {
  return card.domains.every((domain) => legend.domains.includes(domain));
}

export function canSitInMain(card: Card, legend: Card): boolean {
  if (card.kind === "Legend" || card.kind === "Rune" || card.kind === "Battlefield") return false;
  if (card.kind === "Champion" && card.champion !== legend.champion) return false;
  if (card.signatureFor && card.signatureFor !== legend.champion) return false;
  return inIdentity(card, legend);
}

export function suggestRunes(pips: Record<Domain, number>, domains: Domain[]): Record<Domain, number> {
  const suggested = emptyRunes();
  if (domains.length === 0) return suggested;
  if (domains.length === 1) {
    suggested[domains[0]] = RUNE_SIZE;
    return suggested;
  }
  const [a, b] = domains;
  const pa = pips[a] ?? 0;
  const pb = pips[b] ?? 0;
  if (pa === 0 && pb === 0) {
    suggested[a] = 6;
    suggested[b] = 6;
    return suggested;
  }
  if (pa === 0) {
    suggested[b] = RUNE_SIZE;
    return suggested;
  }
  if (pb === 0) {
    suggested[a] = RUNE_SIZE;
    return suggested;
  }
  let na = Math.round((RUNE_SIZE * pa) / (pa + pb));
  na = Math.min(10, Math.max(2, na));
  suggested[a] = na;
  suggested[b] = RUNE_SIZE - na;
  return suggested;
}

function addPips(target: Record<Domain, number>, card: Card, copies: number) {
  for (const domain of DOMAINS) {
    const pips = card.power[domain] ?? 0;
    if (pips) target[domain] += pips * copies;
  }
}

export function analyze(deck: DeckLike): Analysis {
  const legend = legendById(deck.legendId);
  const issues: Issue[] = [];
  const mainCount = countMap(deck.main);
  const sideCount = countMap(deck.side);
  const runeCount = DOMAINS.reduce((sum, domain) => sum + (deck.runes[domain] ?? 0), 0);

  const curveMap = new Map<string, number>();
  for (const label of ["0", "1", "2", "3", "4", "5", "6+"]) curveMap.set(label, 0);
  const typeMap = new Map<string, number>([
    ["Champion", 0],
    ["Unit", 0],
    ["Spell", 0],
    ["Gear", 0],
  ]);
  const pips = emptyRunes();
  const keywords = new Map<string, number>();
  let energySum = 0;
  let mightSum = 0;
  let unitCount = 0;
  let early = 0;
  let signatureCopies = 0;

  const scan = (id: string, copies: number, zone: "main" | "side") => {
    const card = CARD_BY_ID[id];
    if (!card) {
      issues.push({ tone: "bad", text: `Unknown card in the ${zone} deck.` });
      return;
    }
    if (copies > COPY_CAP) {
      issues.push({ tone: "bad", text: `${card.name} has ${copies} copies. The cap is ${COPY_CAP}.` });
    }
    if (legend && !canSitInMain(card, legend)) {
      issues.push({ tone: "bad", text: `${card.name} is outside ${legend.name}'s identity.` });
    }
    if (card.signatureFor) signatureCopies += copies;
  };

  const totals = new Map<string, number>();
  for (const [id, n] of Object.entries(deck.main)) totals.set(id, (totals.get(id) ?? 0) + n);
  for (const [id, n] of Object.entries(deck.side)) totals.set(id, (totals.get(id) ?? 0) + n);
  for (const [id, n] of totals) {
    if (n > COPY_CAP) {
      const card = CARD_BY_ID[id];
      issues.push({
        tone: "bad",
        text: `${card?.name ?? "A card"} is ${n} across main and side. Cap is ${COPY_CAP}, side included.`,
      });
    }
  }

  for (const [id, copies] of Object.entries(deck.main)) {
    if (copies <= 0) continue;
    scan(id, copies, "main");
    const card = CARD_BY_ID[id];
    if (!card) continue;
    const bucket = card.energy >= 6 ? "6+" : String(card.energy);
    curveMap.set(bucket, (curveMap.get(bucket) ?? 0) + copies);
    typeMap.set(card.kind, (typeMap.get(card.kind) ?? 0) + copies);
    addPips(pips, card, copies);
    energySum += card.energy * copies;
    if (card.energy <= 2) early += copies;
    if (card.might != null) {
      mightSum += card.might * copies;
      unitCount += copies;
    }
    for (const keyword of card.keywords) keywords.set(keyword, (keywords.get(keyword) ?? 0) + copies);
  }
  for (const [id, copies] of Object.entries(deck.side)) {
    if (copies <= 0) continue;
    scan(id, copies, "side");
    const card = CARD_BY_ID[id];
    if (card) addPips(pips, card, copies);
  }

  if (!legend) issues.push({ tone: "bad", text: "Choose a legend." });
  if (mainCount !== MAIN_SIZE) {
    issues.push({ tone: "bad", text: `Main deck is ${mainCount}/${MAIN_SIZE}.` });
  }
  if (sideCount > SIDE_CAP) issues.push({ tone: "bad", text: `Side deck is ${sideCount}/${SIDE_CAP}.` });
  if (runeCount !== RUNE_SIZE) issues.push({ tone: "bad", text: `Rune deck is ${runeCount}/${RUNE_SIZE}.` });
  if (deck.battlefields.length !== BATTLEFIELD_COUNT) {
    issues.push({
      tone: "bad",
      text: `Battlefields ${deck.battlefields.length}/${BATTLEFIELD_COUNT}.`,
    });
  }
  if (new Set(deck.battlefields).size !== deck.battlefields.length) {
    issues.push({ tone: "bad", text: "Battlefields must be three different cards." });
  }
  for (const id of deck.battlefields) {
    if (!BATTLEFIELDS.some((card) => card.id === id)) {
      issues.push({ tone: "bad", text: "A battlefield slot has a card that is not a battlefield." });
    }
  }
  if (legend) {
    for (const domain of DOMAINS) {
      if ((deck.runes[domain] ?? 0) > 0 && !legend.domains.includes(domain)) {
        issues.push({ tone: "bad", text: `${domain} runes are outside this legend.` });
      }
    }
  }
  if (signatureCopies > SIGNATURE_CAP) {
    issues.push({ tone: "bad", text: `Signature cards are ${signatureCopies}/${SIGNATURE_CAP}.` });
  }

  const chosen = deck.chosenId ? CARD_BY_ID[deck.chosenId] : undefined;
  if (!chosen) {
    issues.push({ tone: "bad", text: "Pick a chosen champion. It counts toward the 40." });
  } else if (legend) {
    if (chosen.kind !== "Champion" || chosen.champion !== legend.champion) {
      issues.push({ tone: "bad", text: "Chosen champion has to be one of this legend's champion units." });
    } else if ((deck.main[chosen.id] ?? 0) < 1) {
      issues.push({ tone: "bad", text: "Put at least one copy of the chosen champion in the main deck." });
    } else if (!inIdentity(chosen, legend)) {
      issues.push({ tone: "bad", text: "Chosen champion is outside the legend's domains." });
    }
  }

  if (mainCount === MAIN_SIZE && early < 12) {
    issues.push({
      tone: "warn",
      text: `Only ${early} cards cost 2 or less. Lists under 12 usually start late.`,
    });
  }
  if (mainCount > 0 && (typeMap.get("Unit") ?? 0) + (typeMap.get("Champion") ?? 0) < 18) {
    issues.push({ tone: "warn", text: "Fewer than 18 units. Battlefields are hard to take without bodies." });
  }

  const domains = legend?.domains ?? [];
  const suggested = suggestRunes(pips, domains);
  if (legend && runeCount === RUNE_SIZE && legend.domains.length === 2) {
    const [a, b] = legend.domains;
    const drift = Math.abs((deck.runes[a] ?? 0) - suggested[a]);
    if (drift >= 3) {
      issues.push({
        tone: "warn",
        text: `Rune split is ${deck.runes[a]} ${a} / ${deck.runes[b]} ${b}. Power pips suggest ${suggested[a]}/${suggested[b]}.`,
      });
    }
  }

  const curve = [...curveMap.entries()].map(([cost, count]) => ({ cost, count }));
  const types = [...typeMap.entries()]
    .filter(([, count]) => count > 0)
    .map(([name, count]) => ({ name, count }));
  const keywordList = [...keywords.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    legend,
    issues,
    mainCount,
    sideCount,
    runeCount,
    curve,
    types,
    pips: domains.map((domain) => ({ domain, pips: pips[domain] })),
    suggested,
    keywords: keywordList,
    early,
    avgEnergy: mainCount ? energySum / mainCount : 0,
    avgMight: unitCount ? mightSum / unitCount : 0,
    unitCount,
    legal: !issues.some((issue) => issue.tone === "bad"),
  };
}

export function openingHand(main: Record<string, number>, size = 5): string[] {
  const bag: string[] = [];
  for (const [id, copies] of Object.entries(main)) {
    for (let i = 0; i < copies; i += 1) bag.push(id);
  }
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = bag[i];
    bag[i] = bag[j]!;
    bag[j] = swap!;
  }
  return bag.slice(0, Math.min(size, bag.length));
}

export function encodeDeck(deck: DeckLike & { name?: string }): string {
  const main = Object.entries(deck.main)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => `${id}*${n}`)
    .join(",");
  const side = Object.entries(deck.side)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => `${id}*${n}`)
    .join(",");
  const runes = DOMAINS.map((domain) => `${domain.slice(0, 2)}${deck.runes[domain] ?? 0}`).join(".");
  return [
    "RB1",
    deck.legendId,
    deck.chosenId ?? "",
    encodeURIComponent(deck.name ?? "List"),
    main,
    side,
    runes,
    deck.battlefields.join(","),
  ].join("|");
}

export function decodeDeck(raw: string): (DeckLike & { name: string }) | null {
  const parts = raw.trim().split("|");
  if (parts.length < 8 || parts[0] !== "RB1") return null;
  const legend = legendById(parts[1]);
  if (!legend) return null;
  const read = (chunk: string) => {
    const map: Record<string, number> = {};
    if (!chunk) return map;
    for (const pair of chunk.split(",")) {
      const [id, n] = pair.split("*");
      if (!id || !CARD_BY_ID[id]) continue;
      const copies = Number(n);
      if (Number.isFinite(copies) && copies > 0) map[id] = Math.min(COPY_CAP, Math.floor(copies));
    }
    return map;
  };
  const runes = emptyRunes();
  for (const piece of (parts[6] ?? "").split(".")) {
    const domain = DOMAINS.find((item) => item.slice(0, 2) === piece.slice(0, 2));
    const n = Number(piece.slice(2));
    if (domain && Number.isFinite(n)) runes[domain] = Math.max(0, Math.floor(n));
  }
  const battlefields = (parts[7] ?? "")
    .split(",")
    .filter((id) => BATTLEFIELDS.some((card) => card.id === id))
    .slice(0, BATTLEFIELD_COUNT);
  let name = "Imported list";
  try {
    name = decodeURIComponent(parts[3] ?? "") || name;
  } catch {
    name = "Imported list";
  }
  const chosenId = parts[2] && CARD_BY_ID[parts[2]] ? parts[2] : null;
  return {
    name,
    legendId: legend.id,
    chosenId,
    main: read(parts[4] ?? ""),
    side: read(parts[5] ?? ""),
    runes,
    battlefields,
  };
}
