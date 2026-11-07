import { createFileRoute, Link } from "@tanstack/react-router";
import { GALLERY_BY_ID } from "@/data/gallery";
import { CARD_BY_ID, CARDS, SOURCE_NOTE } from "@/data/catalog";
import { canSitInMain } from "@/lib/deck-math";
import { useRift } from "@/lib/store";
import { DomainDots, DomainStripe, Shell, Stepper } from "@/components/shell";
import { type Domain } from "@/data/catalog";

export const Route = createFileRoute("/cards/$cardId")({ component: CardPage });

function rulesText(id: string, name: string): string {
  return CARD_BY_ID[id]?.text || CARDS.find((card) => card.name === name)?.text || "";
}

function CardPage() {
  const { cardId } = Route.useParams();
  const printed = GALLERY_BY_ID[cardId];
  const card = CARD_BY_ID[cardId];
  const owned = useRift((state) => state.owned[cardId] ?? 0);
  const setOwned = useRift((state) => state.setOwned);
  const decks = useRift((state) => state.decks);
  const activeId = useRift((state) => state.activeId);
  const bump = useRift((state) => state.bump);
  const deck = decks.find((item) => item.id === activeId);
  const legend = deck ? CARD_BY_ID[deck.legendId] : undefined;
  const addable = Boolean(card && legend && legend.kind === "Legend" && canSitInMain(card, legend));

  if (printed) {
    return (
      <Shell>
        <div className="px-4 pt-5">
          <Link to="/cards" className="text-sm font-semibold text-primary">
            Library
          </Link>
          <article className="mt-3">
            <div className="mx-auto w-full max-w-sm overflow-hidden rounded-card border border-border bg-bg-deep">
              {printed.image ? (
                <img
                  src={printed.image}
                  alt={printed.name}
                  referrerPolicy="no-referrer"
                  className="card-art block w-full object-cover"
                />
              ) : (
                <div className="card-art flex items-end p-4 text-lg font-semibold text-fg">{printed.code}</div>
              )}
            </div>
            <h1 className="mt-4 flex items-center gap-2 font-display text-3xl text-fg">
              <DomainDots
                domains={printed.domains.filter((item): item is Domain =>
                  ["Fury", "Calm", "Mind", "Body", "Chaos", "Order"].includes(item),
                )}
              />
              {printed.name}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {printed.kind || "Card"}
              {printed.champion && printed.kind !== "Champion" ? " · Champion" : ""}
              {printed.energy != null ? ` · Energy ${printed.energy}` : ""}
              {printed.domains.length
                ? ` · ${printed.domains.join(" / ")}`
                : printed.name.startsWith("Neeko")
                  ? " · Colorless"
                  : ""}
            </p>
            <p className="mt-1 text-sm text-muted">
              {printed.code} · {printed.set}
              {printed.rarity ? ` · ${printed.rarity}` : ""}
              {printed.variation ? ` · ${printed.variation}` : ""}
              {printed.banned ? " · Banned" : ""}
            </p>
            {rulesText(printed.id, printed.name) ? (
              <p className="mt-4 text-base leading-relaxed whitespace-pre-line text-fg">
                {rulesText(printed.id, printed.name)}
              </p>
            ) : null}
          </article>
          <section className="mt-4 flex items-center justify-between rounded-card border border-border bg-surface px-4 py-3">
            <div>
              <h2 className="text-lg text-fg">Owned</h2>
              <p className="text-sm text-muted">Playset marker, stored on this device.</p>
            </div>
            <Stepper value={owned} label={printed.name} onChange={(next) => setOwned(printed.id, next)} />
          </section>
        </div>
      </Shell>
    );
  }

  if (!card) {
    return (
      <Shell>
        <div className="px-4 pt-6">
          <h1 className="font-display text-3xl text-fg">Missing card</h1>
          <Link to="/cards" className="mt-4 inline-flex h-11 items-center text-sm font-semibold text-primary">
            Back to the library
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="px-4 pt-5">
        <Link to="/cards" className="text-sm font-semibold text-primary">
          Library
        </Link>
        <article className="mt-3 overflow-hidden rounded-card border border-border bg-surface">
          <div className="flex items-start justify-between gap-3 bg-bg-deep px-4 py-4">
            <div>
              <p className="text-xs font-semibold tracking-widest text-primary uppercase">{card.kind}</p>
              <h1 className="mt-1 font-display text-3xl text-fg">{card.name}</h1>
            </div>
            {card.kind !== "Legend" && card.kind !== "Battlefield" && card.kind !== "Rune" ? (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-primary font-display text-xl text-primary tabular-nums">
                {card.energy}
              </span>
            ) : null}
          </div>
          <div className="px-4 py-3">
            <DomainStripe domains={card.domains} />
          </div>
          <div className="flex flex-wrap gap-2 px-4 pb-2 text-sm text-muted">
            {card.domains.length ? <span>{card.domains.join(" / ")}</span> : <span>No domain</span>}
            {card.might != null ? <span>Might {card.might}</span> : null}
            <span>{card.set}</span>
          </div>
          <p className="px-4 pb-4 text-base leading-relaxed text-fg">{card.text}</p>
          {card.keywords.length > 0 ? (
            <ul className="flex flex-wrap gap-2 px-4 pb-4">
              {card.keywords.map((word) => (
                <li key={word} className="rounded-full border border-border px-3 py-1 text-sm text-fg">
                  {word}
                </li>
              ))}
            </ul>
          ) : null}
        </article>

        <p className="mt-3 text-sm text-muted">{SOURCE_NOTE[card.source]}</p>

        <section className="mt-4 flex items-center justify-between rounded-card border border-border bg-surface px-4 py-3">
          <div>
            <h2 className="text-lg text-fg">Owned</h2>
            <p className="text-sm text-muted">Playset marker, stored on this device.</p>
          </div>
          <Stepper value={owned} label={card.name} onChange={(next) => setOwned(card.id, next)} />
        </section>

        <section className="mt-3 rounded-card border border-border bg-surface px-4 py-4">
          <h2 className="text-lg text-fg">Add to a list</h2>
          {deck && addable ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-sm text-muted">
                Into {deck.name}. Currently {deck.main[card.id] ?? 0}.
              </p>
              <button
                type="button"
                className="inline-flex h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg"
                onClick={() => bump(deck.id, "main", card.id, 1)}
                disabled={(deck.main[card.id] ?? 0) >= 3}
              >
                Add
              </button>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">
              {deck
                ? "This card does not fit the open list's legend."
                : "Open a list in Build, then come back. The adder follows that legend."}
            </p>
          )}
          <Link to="/build" className="mt-3 inline-flex h-11 items-center text-sm font-semibold text-primary">
            Go to Build
          </Link>
        </section>
      </div>
    </Shell>
  );
}
