import { createFileRoute, Link } from "@tanstack/react-router";
import { DeckLine } from "@/components/shell";
import { FAB_DECKS, fabCard, type FabDeckCard, type FabPitch } from "@/data/fab";

export const Route = createFileRoute("/fab/decks/$deckId")({ component: DeckPage });

const PITCHES: Array<{ id: FabPitch; label: string }> = [
  { id: "red", label: "Red" },
  { id: "yellow", label: "Yellow" },
  { id: "blue", label: "Blue" },
  { id: "", label: "No pitch" },
];

function DeckPage() {
  const { deckId } = Route.useParams();
  const deck = FAB_DECKS.find((item) => item.id === deckId);

  if (!deck) {
    return (
      <main className="px-4 pt-6 pb-20">
        <Link to="/fab/decks" className="text-sm font-semibold text-[#c6ff3a]">
          Decks
        </Link>
        <p className="mt-4">That list is not here.</p>
      </main>
    );
  }

  const hero = deck.cards.filter((card) => card.section === "Hero");
  const gear = deck.cards.filter((card) => card.section === "Equipment");
  const pile = deck.cards.filter((card) => card.section === "Deck");

  return (
    <main className="px-4 pt-6 pb-20">
      <Link to="/fab/decks" className="text-sm font-semibold text-[#c6ff3a]">
        Decks
      </Link>
      <h1 className="mt-2 font-display text-4xl">{deck.name}</h1>
      <p className="mt-2 text-sm leading-relaxed text-[#c8c2b4]">
        {deck.player} · {deck.place} · {deck.event}. {deck.format}. Same event Fabrary files for this list.
      </p>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
        <a href={deck.source} className="text-[#c6ff3a]">
          Official list
        </a>
        {deck.fabraryId ? (
          <a href={`https://fabrary.net/decks/${deck.fabraryId}`} className="text-[#c6ff3a]">
            Fabrary
          </a>
        ) : null}
      </p>

      <Section title="Hero" cards={hero} />
      <Section title="Weapons and equipment" cards={gear} />
      {PITCHES.map((pitch) => {
        const cards = pile.filter((card) => card.pitch === pitch.id);
        if (!cards.length) return null;
        return <Section key={pitch.label} title={pitch.label} cards={cards} />;
      })}
    </main>
  );
}

function Section({ title, cards }: { title: string; cards: FabDeckCard[] }) {
  return (
    <section className="mt-5">
      <h2 className="text-lg text-[#f4f1e8]">{title}</h2>
      <ul className="mt-2 flex flex-col gap-1">
        {cards.map((entry) => {
          const card = fabCard(entry.name, entry.pitch);
          const pitch = entry.pitch ? entry.pitch[0].toUpperCase() + entry.pitch.slice(1) : "";
          const row = (
            <DeckLine
              image={card?.image}
              count={entry.count}
              name={entry.name}
              line={[card?.type || "Card", pitch].filter(Boolean).join(" · ")}
            />
          );
          return (
            <li key={`${entry.section}-${entry.name}-${entry.pitch}`}>
              {card ? (
                <Link to="/fab/cards/$cardId" params={{ cardId: card.id }}>
                  {row}
                </Link>
              ) : (
                row
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
