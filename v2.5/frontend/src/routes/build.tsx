import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BATTLEFIELDS,
  CARD_BY_ID,
  CARDS,
  LEGENDS,
  championsFor,
  type Card,
} from "@/data/catalog";
import { analyze, canSitInMain, decodeDeck, encodeDeck, type Analysis } from "@/lib/deck-math";
import { useDeskReady, useRift, type SavedDeck } from "@/lib/store";
import { DeckStats, IssueList } from "@/components/deck-stats";
import { cardLine, CardThumb, DomainDots, DomainStripe, MascotLine, Note, Shell, Stepper } from "@/components/shell";

export const Route = createFileRoute("/build")({ component: BuildPage });

function BuildPage() {
  const ready = useDeskReady();
  const decks = useRift((state) => state.decks);
  const activeId = useRift((state) => state.activeId);
  const setActive = useRift((state) => state.setActive);
  const createDeck = useRift((state) => state.createDeck);
  const deck = decks.find((item) => item.id === activeId) ?? null;

  if (!ready) {
    return (
      <Shell>
        <div className="px-4 pt-6">
          <MascotLine>Opening the desk…</MascotLine>
        </div>
      </Shell>
    );
  }

  if (!deck) {
    return (
      <Shell>
        <DeckPicker
          decks={decks}
          onOpen={setActive}
          onCreate={(legendId) => {
            createDeck(legendId);
          }}
        />
      </Shell>
    );
  }

  return (
    <Shell bar>
      <Editor deck={deck} onBack={() => setActive(null)} />
    </Shell>
  );
}

function DeckPicker({
  decks,
  onOpen,
  onCreate,
}: {
  decks: SavedDeck[];
  onOpen: (id: string) => void;
  onCreate: (legendId: string) => void;
}) {
  const importDeck = useRift((state) => state.importDeck);
  const [code, setCode] = useState("");
  const [importNote, setImportNote] = useState("");

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-6">
      <header>
        <h1 className="font-display text-4xl text-fg">Build</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          A legend locks two domains. The main deck is 40, the rune deck is 12, and you bring 3 battlefields.
        </p>
      </header>
      {decks.length > 0 ? (
        <section>
          <h2 className="text-xl text-fg">Saved on this phone</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {decks.map((deck) => {
              const legend = CARD_BY_ID[deck.legendId];
              const report = analyze(deck);
              return (
                <li key={deck.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(deck.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3 text-left"
                  >
                    <span>
                      <span className="block font-semibold text-fg">{deck.name}</span>
                      <span className="mt-1 flex items-center gap-2 text-sm text-muted">
                        <DomainDots domains={legend?.domains ?? []} size="sm" />
                        {report.mainCount}/40
                      </span>
                    </span>
                    <span className={report.legal ? "text-sm text-ok" : "text-sm text-danger"}>
                      {report.legal ? "Legal" : "Draft"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      <section>
        <h2 className="text-xl text-fg">New list</h2>
        <ul className="mt-2 grid grid-cols-2 gap-2">
          {LEGENDS.map((legend) => (
            <li key={legend.id}>
              <button
                type="button"
                onClick={() => onCreate(legend.id)}
                className="flex h-full w-full flex-col items-start gap-2 rounded-card border border-border bg-surface px-3 py-3 text-left"
              >
                <DomainStripe domains={legend.domains} />
                <span className="font-semibold text-fg">{legend.champion}</span>
                <span className="text-xs text-muted">{legend.domains.join(" · ")}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-card border border-border bg-surface p-4">
        <h2 className="text-lg text-fg">Paste a code</h2>
        <textarea
          value={code}
          onChange={(event) => setCode(event.target.value)}
          rows={3}
          placeholder="RB1|…"
          className="mt-2 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-faint"
          aria-label="Deck code"
        />
        <button
          type="button"
          className="mt-2 inline-flex h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg"
          onClick={() => {
            const parsed = decodeDeck(code);
            if (!parsed) {
              setImportNote("That code is not a Riftbook list.");
              return;
            }
            importDeck(parsed);
            setImportNote("");
          }}
        >
          Import
        </button>
        {importNote ? <p className="mt-2 text-sm text-danger">{importNote}</p> : null}
      </section>
    </div>
  );
}

function Editor({ deck, onBack }: { deck: SavedDeck; onBack: () => void }) {
  const [tab, setTab] = useState<"list" | "stats" | "runes">("list");
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const rename = useRift((state) => state.rename);
  const removeDeck = useRift((state) => state.removeDeck);
  const setLegend = useRift((state) => state.setLegend);
  const setChosen = useRift((state) => state.setChosen);
  const bump = useRift((state) => state.bump);
  const setRune = useRift((state) => state.setRune);
  const applyRunes = useRift((state) => state.applyRunes);
  const toggleBattlefield = useRift((state) => state.toggleBattlefield);

  const legend = CARD_BY_ID[deck.legendId];
  const report = useMemo(() => analyze(deck), [deck]);
  const champs = legend && legend.kind === "Legend" ? championsFor(legend) : [];
  const rows = Object.entries(deck.main)
    .map(([id, copies]) => ({ card: CARD_BY_ID[id], copies }))
    .filter((row): row is { card: Card; copies: number } => Boolean(row.card))
    .sort((a, b) => a.card.energy - b.card.energy || a.card.name.localeCompare(b.card.name));

  return (
    <div className="px-4 pt-5">
      <button type="button" onClick={onBack} className="text-sm font-semibold text-primary">
        All lists
      </button>
      <input
        value={deck.name}
        onChange={(event) => rename(deck.id, event.target.value)}
        aria-label="Deck name"
        className="mt-2 w-full bg-transparent font-display text-4xl text-fg outline-none"
      />
      {legend ? (
        <p className="mt-2 text-sm leading-relaxed text-muted">{legend.text}</p>
      ) : null}

      <label className="mt-4 block text-xs font-semibold tracking-widest text-faint uppercase">
        Legend
        <select
          value={deck.legendId}
          onChange={(event) => setLegend(deck.id, event.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-base font-medium tracking-normal text-fg normal-case"
        >
          {LEGENDS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3 flex gap-2">
        {(
          [
            ["list", "List"],
            ["stats", "Stats"],
            ["runes", "Runes"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={
              tab === id
                ? "inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-fg"
                : "inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-border bg-surface text-sm font-medium text-fg"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "list" ? (
        <div className="mt-4 flex flex-col gap-4">
          <section>
            <h2 className="text-lg text-fg">Chosen champion</h2>
            <div className="mt-2 flex flex-col gap-2">
              {champs.map((champ) => {
                const on = deck.chosenId === champ.id;
                return (
                  <button
                    key={champ.id}
                    type="button"
                    onClick={() => setChosen(deck.id, champ.id)}
                    className={
                      on
                        ? "rounded-card border border-primary bg-surface px-3 py-3 text-left"
                        : "rounded-card border border-border bg-surface px-3 py-3 text-left"
                    }
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-fg">{champ.name}</span>
                      <DomainDots domains={champ.domains} size="sm" />
                    </span>
                    <span className="mt-1 block text-xs text-muted">{cardLine(champ)}</span>
                  </button>
                );
              })}
            </div>
          </section>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-fg"
          >
            Add cards
          </button>
          <ul className="flex flex-col gap-2">
            {rows.length === 0 ? (
              <li>
                <MascotLine>The main deck is empty.</MascotLine>
              </li>
            ) : (
              rows.map(({ card, copies }) => (
                <li
                  key={card.id}
                  className="flex items-center gap-2 rounded-card border border-border bg-surface py-1 pr-1 pl-2"
                >
                  <Link
                    to="/cards/$cardId"
                    params={{ cardId: card.id }}
                    className="flex min-w-0 flex-1 items-center gap-2"
                  >
                    <CardThumb image={card.image} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-fg">
                        {deck.chosenId === card.id ? "Chosen · " : ""}
                        {card.name}
                      </span>
                      <span className="text-xs text-muted">{cardLine(card)}</span>
                    </span>
                  </Link>
                  <Stepper
                    value={copies}
                    label={card.name}
                    onChange={(next) => bump(deck.id, "main", card.id, next - copies)}
                  />
                </li>
              ))
            )}
          </ul>
          <Sideboard deck={deck} />
        </div>
      ) : null}

      {tab === "stats" ? (
        <div className="mt-4 flex flex-col gap-3">
          <IssueList analysis={report} />
          <DeckStats analysis={report} main={deck.main} />
          <CodeBox
            code={encodeDeck(deck)}
            copied={copied}
            onCopy={() => {
              const text = encodeDeck(deck);
              void navigator.clipboard?.writeText(text).then(
                () => setCopied(true),
                () => setCopied(false),
              );
            }}
          />
        </div>
      ) : null}

      {tab === "runes" ? (
        <RunePanel
          deck={deck}
          report={report}
          onRune={(domain, value) => setRune(deck.id, domain, value)}
          onApply={() => applyRunes(deck.id, report.suggested)}
          onField={(id) => toggleBattlefield(deck.id, id)}
        />
      ) : null}

      <div className="mt-6 flex items-center justify-between pb-4">
        {confirmDelete ? (
          <button
            type="button"
            className="text-sm font-semibold text-danger"
            onClick={() => removeDeck(deck.id)}
          >
            Confirm delete
          </button>
        ) : (
          <button type="button" className="text-sm font-semibold text-faint" onClick={() => setConfirmDelete(true)}>
            Delete list
          </button>
        )}
      </div>

      <div className="above-dock border-t border-border bg-bg-deep">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm text-fg">
            <span className="font-display text-xl tabular-nums">{report.mainCount}</span>
            <span className="text-muted">/40</span>
            <span className="mx-2 text-faint">·</span>
            <span className="tabular-nums text-muted">{report.runeCount}/12 runes</span>
          </p>
          <span className={report.legal ? "text-sm font-semibold text-ok" : "text-sm font-semibold text-danger"}>
            {report.legal ? "Legal" : `${report.issues.filter((issue) => issue.tone === "bad").length} to fix`}
          </span>
        </div>
      </div>

      {adding && legend && legend.kind === "Legend" ? (
        <AddSheet deck={deck} onClose={() => setAdding(false)} />
      ) : null}
    </div>
  );
}

function Sideboard({ deck }: { deck: SavedDeck }) {
  const bump = useRift((state) => state.bump);
  const rows = Object.entries(deck.side)
    .map(([id, copies]) => ({ card: CARD_BY_ID[id], copies }))
    .filter((row): row is { card: Card; copies: number } => Boolean(row.card));
  return (
    <section>
      <h2 className="text-lg text-fg">Side deck · {rows.reduce((sum, row) => sum + row.copies, 0)}/10</h2>
      <p className="mt-1 text-sm text-muted">Same identity. Copies count toward the 3-of with the main deck.</p>
      {rows.length === 0 ? <div className="mt-2"><MascotLine>Empty. Add cards, then move them here.</MascotLine></div> : null}
      <ul className="mt-2 flex flex-col gap-2">
        {rows.map(({ card, copies }) => (
          <li key={card.id} className="flex items-center gap-2 rounded-card border border-border bg-surface py-1 pr-1 pl-2">
            <Link to="/cards/$cardId" params={{ cardId: card.id }} className="flex min-w-0 flex-1 items-center gap-2">
              <CardThumb image={card.image} />
              <span className="min-w-0 truncate text-sm text-fg">{card.name}</span>
            </Link>
            <Stepper value={copies} label={card.name} onChange={(next) => bump(deck.id, "side", card.id, next - copies)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function AddSheet({ deck, onClose }: { deck: SavedDeck; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [zone, setZone] = useState<"main" | "side">("main");
  const bump = useRift((state) => state.bump);
  const legend = CARD_BY_ID[deck.legendId];
  const rows = useMemo(() => {
    if (!legend || legend.kind !== "Legend") return [];
    const q = query.trim().toLowerCase();
    return CARDS.filter((card) => canSitInMain(card, legend)).filter((card) => {
      if (!q) return true;
      return card.name.toLowerCase().includes(q) || card.kind.toLowerCase().includes(q);
    });
  }, [legend, query]);

  return (
    <div className="fixed inset-0 z-40 bg-bg">
      <div className="mx-auto flex h-dvh max-w-3xl flex-col px-4 pt-4 page-pad">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-fg">Add to {zone}</h2>
          <button type="button" onClick={onClose} className="inline-flex h-11 items-center text-sm font-semibold text-primary">
            Done
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          {(["main", "side"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setZone(item)}
              className={
                zone === item
                  ? "inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-fg"
                  : "inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-border text-sm text-fg"
              }
            >
              {item === "main" ? "Main" : "Side"}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter legal cards"
          aria-label="Filter legal cards"
          className="mt-3 h-11 w-full rounded-xl border border-border bg-surface px-3 text-base text-fg placeholder:text-faint"
        />
        <ul className="mt-3 flex flex-1 flex-col gap-2 overflow-y-auto pb-4">
          {rows.map((card) => {
            const copies = deck[zone][card.id] ?? 0;
            const across = (deck.main[card.id] ?? 0) + (deck.side[card.id] ?? 0);
            return (
              <li key={card.id} className="flex items-center justify-between gap-2 rounded-card border border-border bg-surface px-2 py-2">
                <Link to="/cards/$cardId" params={{ cardId: card.id }} className="flex min-w-0 flex-1 items-center gap-2">
                  <CardThumb image={card.image} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-fg">{card.name}</span>
                    <span className="text-xs text-muted">{cardLine(card)}</span>
                  </span>
                </Link>
                <span className="inline-flex items-center gap-2">
                  <span className="w-6 text-center text-sm tabular-nums text-muted">{copies}</span>
                  <button
                    type="button"
                    disabled={across >= 3}
                    onClick={() => bump(deck.id, zone, card.id, 1)}
                    className="inline-flex h-11 items-center rounded-xl bg-primary px-3 text-sm font-semibold text-primary-fg disabled:opacity-40"
                  >
                    Add
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function RunePanel({
  deck,
  report,
  onRune,
  onApply,
  onField,
}: {
  deck: SavedDeck;
  report: Analysis;
  onRune: (domain: import("@/data/catalog").Domain, value: number) => void;
  onApply: () => void;
  onField: (id: string) => void;
}) {
  const domains = report.legend?.domains ?? [];
  return (
    <div className="mt-4 flex flex-col gap-4">
      <Note>Twelve runes, only in the legend's domains. Suggested split follows power pips in the main deck.</Note>
      {domains.map((domain) => (
        <div key={domain} className="flex items-center justify-between rounded-card border border-border bg-surface px-3 py-2">
          <span className="inline-flex items-center gap-2 font-medium text-fg">
            <DomainDots domains={[domain]} />
            {domain}
          </span>
          <Stepper value={deck.runes[domain] ?? 0} max={12} label={`${domain} runes`} onChange={(next) => onRune(domain, next)} />
        </div>
      ))}
      <button
        type="button"
        onClick={onApply}
        className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-surface text-sm font-semibold text-fg"
      >
        Use suggested split
      </button>
      <section>
        <h2 className="text-lg text-fg">Battlefields · {deck.battlefields.length}/3</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {BATTLEFIELDS.map((field) => {
            const on = deck.battlefields.includes(field.id);
            const locked = !on && deck.battlefields.length >= 3;
            return (
              <li key={field.id}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => onField(field.id)}
                  className={
                    on
                      ? "w-full rounded-card border border-primary bg-surface px-3 py-3 text-left disabled:opacity-40"
                      : "w-full rounded-card border border-border bg-surface px-3 py-3 text-left disabled:opacity-40"
                  }
                >
                  <span className="block font-semibold text-fg">{field.name}</span>
                  <span className="mt-1 block text-sm text-muted">{field.text}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function CodeBox({ code, copied, onCopy }: { code: string; copied: boolean; onCopy: () => void }) {
  return (
    <section className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg text-fg">Deck code</h3>
        <button type="button" onClick={onCopy} className="inline-flex h-11 items-center text-sm font-semibold text-primary">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <textarea readOnly value={code} rows={4} className="mt-2 w-full rounded-xl bg-bg px-3 py-2 text-xs text-muted" />
    </section>
  );
}
