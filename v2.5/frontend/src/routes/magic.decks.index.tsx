import { createFileRoute, Link } from "@tanstack/react-router";
import { MAGIC_BY_NAME, MAGIC_DECKS } from "@/data/magic";

export const Route = createFileRoute("/magic/decks/")({ component: Decks });

function Decks() {
  return (
    <main className="px-4 pt-6 pb-20">
      <Link to="/magic" className="text-sm font-semibold text-[#c6ff3a]">
        Magisterium
      </Link>
      <h1 className="mt-2 font-display text-4xl">Popular decks</h1>
      <p className="mt-1 text-sm text-[#c8c2b4]">Standard lists from mtgdecks.net and Archidekt. Sideboards are on the page.</p>
      <ul className="mt-4 flex flex-col gap-3">
        {MAGIC_DECKS.map((deck) => {
          const face = deck.cards.map((entry) => MAGIC_BY_NAME[entry.name]).find((card) => card?.image);
          const count = deck.cards.reduce((sum, card) => sum + card.count, 0);
          const side = (deck.side ?? []).reduce((sum, card) => sum + card.count, 0);
          return (
            <li key={deck.id}>
              <Link
                to="/magic/decks/$deckId"
                params={{ deckId: deck.id }}
                className="flex items-center gap-3 rounded-3xl border border-[#33362c] bg-[#171910] p-3"
              >
                {face?.image ? (
                  <img src={face.image} alt="" className="h-24 w-[4.3rem] rounded-xl object-cover" />
                ) : null}
                <span>
                  <span className="block font-display text-2xl">{deck.name}</span>
                  <span className="mt-1 block text-sm text-[#c8c2b4]">
                    {deck.format} · {count} cards{side ? ` · ${side} side` : ""}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
