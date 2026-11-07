import { createFileRoute, Link } from "@tanstack/react-router";
import { DeckLine } from "@/components/shell";
import { MAGIC_BY_NAME, MAGIC_DECKS } from "@/data/magic";

export const Route = createFileRoute("/magic/decks/$deckId")({ component: DeckPage });

function DeckPage() {
  const { deckId } = Route.useParams();
  const deck = MAGIC_DECKS.find((item) => item.id === deckId);

  if (!deck) {
    return (
      <main className="px-4 pt-6 pb-20">
        <Link to="/magic/decks" className="text-sm font-semibold text-[#c6ff3a]">
          Decks
        </Link>
        <p className="mt-4">That list is not here.</p>
      </main>
    );
  }

  return (
    <main className="px-4 pt-6 pb-20">
      <Link to="/magic/decks" className="text-sm font-semibold text-[#c6ff3a]">
        Decks
      </Link>
      <h1 className="mt-2 font-display text-4xl">{deck.name}</h1>
      <p className="mt-2 text-sm leading-relaxed text-[#c8c2b4]">{deck.note}</p>
      {deck.source ? (
        <a href={deck.source} className="mt-2 inline-block text-sm font-semibold text-[#c6ff3a]">
          {deck.source.includes("archidekt.com") ? "From Archidekt" : "From mtgdecks.net"}
        </a>
      ) : null}
      <CardList cards={deck.cards} />
      {deck.side?.length ? (
        <>
          <h2 className="mt-6 text-xl">Sideboard</h2>
          <CardList cards={deck.side} />
        </>
      ) : null}
    </main>
  );
}

function CardList({ cards }: { cards: { name: string; count: number }[] }) {
  return (
    <ul className="mt-2 flex flex-col gap-1">
      {cards.map((entry) => {
        const card = MAGIC_BY_NAME[entry.name];
        const row = <DeckLine image={card?.image} count={entry.count} name={entry.name} line={card?.type ?? "Card"} />;
        return (
          <li key={entry.name}>
            {card ? (
              <Link to="/magic/cards/$cardId" params={{ cardId: card.id }}>
                {row}
              </Link>
            ) : (
              row
            )}
          </li>
        );
      })}
    </ul>
  );
}
