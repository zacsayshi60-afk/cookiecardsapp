import { createFileRoute, Link } from "@tanstack/react-router";
import { FAB_DECKS, fabCard } from "@/data/fab";

export const Route = createFileRoute("/fab/decks/")({ component: Decks });

function Decks() {
  return (
    <main className="px-4 pt-6 pb-20">
      <Link to="/fab" className="text-sm font-semibold text-[#c6ff3a]">
        Rathe Archive
      </Link>
      <h1 className="mt-2 font-display text-4xl">Decks</h1>
      <p className="mt-1 text-sm text-[#c8c2b4]">Calling: Mexico City 2026. Classic Constructed, 80 cards each.</p>
      <ul className="mt-4 flex flex-col gap-3">
        {FAB_DECKS.map((deck) => {
          const face = fabCard(deck.hero, "");
          return (
            <li key={deck.id}>
              <Link
                to="/fab/decks/$deckId"
                params={{ deckId: deck.id }}
                className="flex items-center gap-3 rounded-3xl border border-[#33362c] bg-[#171910] p-3"
              >
                {face?.image ? (
                  <img
                    src={face.image}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-24 w-[4.3rem] rounded-xl object-cover"
                  />
                ) : null}
                <span>
                  <span className="block font-display text-2xl">{deck.name}</span>
                  <span className="mt-1 block text-sm text-[#c8c2b4]">
                    {deck.place} · {deck.player}
                  </span>
                  <span className="mt-0.5 block text-sm text-[#8d887c]">{deck.country}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
