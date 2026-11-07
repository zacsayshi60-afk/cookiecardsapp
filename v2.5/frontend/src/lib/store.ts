import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CARD_BY_ID, type Card, type Domain } from "@/data/catalog";
import { metaById } from "@/data/meta";
import { canSitInMain, emptyRunes, type DeckLike } from "@/lib/deck-math";

export type SavedDeck = DeckLike & {
  id: string;
  name: string;
  updatedAt: number;
};

export type MatchLog = {
  id: string;
  at: number;
  deckId: string | null;
  oppLegendId: string;
  result: "W" | "L";
  note: string;
};

type State = {
  ready: boolean;
  decks: SavedDeck[];
  activeId: string | null;
  owned: Record<string, number>;
  matches: MatchLog[];
  setReady: (ready: boolean) => void;
  setActive: (id: string | null) => void;
  createDeck: (legendId: string) => string;
  importDeck: (deck: DeckLike & { name: string }) => string;
  cloneMeta: (metaId: string) => string | null;
  rename: (id: string, name: string) => void;
  removeDeck: (id: string) => void;
  setLegend: (id: string, legendId: string) => void;
  setChosen: (id: string, chosenId: string) => void;
  bump: (id: string, zone: "main" | "side", cardId: string, delta: number) => void;
  setRune: (id: string, domain: Domain, value: number) => void;
  applyRunes: (id: string, runes: Record<Domain, number>) => void;
  toggleBattlefield: (id: string, cardId: string) => void;
  setOwned: (cardId: string, value: number) => void;
  addMatch: (entry: Omit<MatchLog, "id" | "at">) => void;
  removeMatch: (id: string) => void;
};

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function evenRunes(domains: Domain[]): Record<Domain, number> {
  const runes = emptyRunes();
  if (domains.length === 1) runes[domains[0]!] = 12;
  if (domains.length >= 2) {
    runes[domains[0]!] = 6;
    runes[domains[1]!] = 6;
  }
  return runes;
}

function blank(legend: Card, name: string): SavedDeck {
  return {
    id: uid(),
    name,
    legendId: legend.id,
    chosenId: null,
    main: {},
    side: {},
    runes: evenRunes(legend.domains),
    battlefields: [],
    updatedAt: Date.now(),
  };
}

function patch(decks: SavedDeck[], id: string, recipe: (deck: SavedDeck) => SavedDeck): SavedDeck[] {
  return decks.map((deck) => (deck.id === id ? { ...recipe(deck), updatedAt: Date.now() } : deck));
}

export const useRift = create<State>()(
  persist(
    (set, get) => ({
      ready: false,
      decks: [],
      activeId: null,
      owned: {},
      matches: [],
      setReady: (ready) => set({ ready }),
      setActive: (id) => set({ activeId: id }),
      createDeck: (legendId) => {
        const legend = CARD_BY_ID[legendId];
        if (!legend || legend.kind !== "Legend") return "";
        const deck = blank(legend, legend.name);
        set({ decks: [deck, ...get().decks], activeId: deck.id });
        return deck.id;
      },
      importDeck: (incoming) => {
        const legend = CARD_BY_ID[incoming.legendId];
        if (!legend || legend.kind !== "Legend") return "";
        const deck: SavedDeck = {
          id: uid(),
          name: incoming.name || "Imported list",
          legendId: legend.id,
          chosenId: incoming.chosenId,
          main: incoming.main,
          side: incoming.side,
          runes: { ...emptyRunes(), ...incoming.runes },
          battlefields: incoming.battlefields,
          updatedAt: Date.now(),
        };
        set({ decks: [deck, ...get().decks], activeId: deck.id });
        return deck.id;
      },
      cloneMeta: (metaId) => {
        const meta = metaById(metaId);
        if (!meta) return null;
        const deck: SavedDeck = {
          id: uid(),
          name: meta.name,
          legendId: meta.legendId,
          chosenId: meta.chosenId,
          main: { ...meta.main },
          side: { ...meta.side },
          runes: { ...meta.runes },
          battlefields: [...meta.battlefields],
          updatedAt: Date.now(),
        };
        set({ decks: [deck, ...get().decks], activeId: deck.id });
        return deck.id;
      },
      rename: (id, name) => set({ decks: patch(get().decks, id, (deck) => ({ ...deck, name })) }),
      removeDeck: (id) =>
        set({
          decks: get().decks.filter((deck) => deck.id !== id),
          activeId: get().activeId === id ? null : get().activeId,
        }),
      setLegend: (id, legendId) => {
        const legend = CARD_BY_ID[legendId];
        if (!legend || legend.kind !== "Legend") return;
        set({
          decks: patch(get().decks, id, (deck) => {
            const keep = (map: Record<string, number>) => {
              const next: Record<string, number> = {};
              for (const [cardId, copies] of Object.entries(map)) {
                const card = CARD_BY_ID[cardId];
                if (card && canSitInMain(card, legend)) next[cardId] = copies;
              }
              return next;
            };
            const chosen = deck.chosenId ? CARD_BY_ID[deck.chosenId] : undefined;
            const chosenOk = chosen && chosen.champion === legend.champion && canSitInMain(chosen, legend);
            return {
              ...deck,
              legendId,
              chosenId: chosenOk ? deck.chosenId : null,
              main: keep(deck.main),
              side: keep(deck.side),
              runes: evenRunes(legend.domains),
            };
          }),
        });
      },
      setChosen: (id, chosenId) =>
        set({
          decks: patch(get().decks, id, (deck) => {
            const main = { ...deck.main };
            if ((main[chosenId] ?? 0) < 1) main[chosenId] = 1;
            return { ...deck, chosenId, main };
          }),
        }),
      bump: (id, zone, cardId, delta) =>
        set({
          decks: patch(get().decks, id, (deck) => {
            const map = { ...deck[zone] };
            const next = (map[cardId] ?? 0) + delta;
            if (next <= 0) delete map[cardId];
            else map[cardId] = Math.min(3, next);
            const chosenId = zone === "main" && deck.chosenId === cardId && next <= 0 ? null : deck.chosenId;
            return { ...deck, [zone]: map, chosenId };
          }),
        }),
      setRune: (id, domain, value) =>
        set({
          decks: patch(get().decks, id, (deck) => ({
            ...deck,
            runes: { ...deck.runes, [domain]: Math.max(0, Math.min(12, value)) },
          })),
        }),
      applyRunes: (id, runes) =>
        set({
          decks: patch(get().decks, id, (deck) => ({ ...deck, runes: { ...emptyRunes(), ...runes } })),
        }),
      toggleBattlefield: (id, cardId) =>
        set({
          decks: patch(get().decks, id, (deck) => {
            const has = deck.battlefields.includes(cardId);
            if (has) return { ...deck, battlefields: deck.battlefields.filter((item) => item !== cardId) };
            if (deck.battlefields.length >= 3) return deck;
            return { ...deck, battlefields: [...deck.battlefields, cardId] };
          }),
        }),
      setOwned: (cardId, value) =>
        set({
          owned: { ...get().owned, [cardId]: Math.max(0, Math.min(3, value)) },
        }),
      addMatch: (entry) =>
        set({
          matches: [{ ...entry, id: uid(), at: Date.now() }, ...get().matches].slice(0, 200),
        }),
      removeMatch: (id) => set({ matches: get().matches.filter((match) => match.id !== id) }),
    }),
    {
      name: "riftbook",
      version: 1,
      skipHydration: true,
      migrate: (persisted) => {
        const saved = persisted as { decks?: SavedDeck[]; activeId?: string | null };
        const decks = (saved.decks ?? []).filter((deck) => CARD_BY_ID[deck.legendId]?.kind === "Legend");
        const activeId = decks.some((deck) => deck.id === saved.activeId) ? saved.activeId ?? null : null;
        return { ...saved, decks, activeId };
      },
      partialize: (state) => ({
        decks: state.decks,
        activeId: state.activeId,
        owned: state.owned,
        matches: state.matches,
      }),
    },
  ),
);

let booted = false;

export function useDeskReady(): boolean {
  const ready = useRift((state) => state.ready);
  useEffect(() => {
    if (booted) return;
    booted = true;
    const pending = useRift.persist.rehydrate();
    void Promise.resolve(pending).finally(() => {
      useRift.getState().setReady(true);
    });
  }, []);
  return ready;
}
