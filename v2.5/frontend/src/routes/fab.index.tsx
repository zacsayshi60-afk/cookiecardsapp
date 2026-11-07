import { createFileRoute, Link } from "@tanstack/react-router";
import { CountryAsk } from "@/components/country-field";
import { FAB_DECKS, FAB_INDEX, fabCard } from "@/data/fab";
import { useCountry } from "@/lib/country";

export const Route = createFileRoute("/fab/")({ component: Rathe });

function Rathe() {
  const { country } = useCountry();
  const local = country ? FAB_DECKS.filter((deck) => deck.country === country) : [];
  const filed = new Set(FAB_DECKS.map((deck) => deck.fabraryId).filter(Boolean));
  const more = FAB_INDEX.filter((hit) => !filed.has(hit.id));

  return (
    <main className="px-4 pt-2 pb-4">
      <p className="text-xs font-semibold tracking-widest text-[#c6ff3a] uppercase">Flesh and Blood</p>
      <h1 className="mt-1 font-display text-4xl text-[#f4f1e8]">Rathe Archive</h1>
      <p className="mt-2 max-w-md text-base leading-relaxed text-[#c8c2b4]">
        Calling lists from the same events Fabrary files. Card pictures come from CardVault.
      </p>

      <section className="mt-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-xl text-[#f4f1e8]">Popular decks</h2>
          <Link to="/fab/decks" className="text-sm font-semibold text-[#c6ff3a]">
            All lists
          </Link>
        </div>
        <ul className="flex flex-col gap-2">
          {FAB_DECKS.map((deck) => {
            const face = fabCard(deck.hero, "");
            return (
              <li key={deck.id}>
                <Link
                  to="/fab/decks/$deckId"
                  params={{ deckId: deck.id }}
                  className="flex items-center gap-3 rounded-card border border-[#33362c] bg-[#171910] px-3 py-3"
                >
                  {face?.image ? (
                    <img src={face.image} alt="" referrerPolicy="no-referrer" className="h-20 w-14 rounded-lg object-cover" />
                  ) : null}
                  <span className="min-w-0">
                    <span className="block font-semibold text-[#f4f1e8]">{deck.name}</span>
                    <span className="mt-1 block text-sm text-[#c8c2b4]">
                      {deck.place} · {deck.player}
                    </span>
                    <span className="mt-0.5 block text-sm text-[#8d887c]">{deck.event}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-xl text-[#f4f1e8]">Popular local decks</h2>
        <div className="mt-2">
          <CountryAsk tone="fab" />
        </div>
        {!country ? null : local.length === 0 ? (
          <p className="mt-3 text-sm text-[#c8c2b4]">No Flesh and Blood lists filed for {country} yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {local.map((deck) => (
              <li key={deck.id}>
                <Link
                  to="/fab/decks/$deckId"
                  params={{ deckId: deck.id }}
                  className="block rounded-card border border-[#33362c] bg-[#171910] px-4 py-3"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-[#f4f1e8]">{deck.name}</span>
                    <span className="text-sm text-[#c6ff3a]">{deck.place}</span>
                  </span>
                  <span className="mt-1 block text-sm text-[#c8c2b4]">
                    {deck.player} · {deck.event}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {more.length ? (
        <section className="mt-6">
          <h2 className="text-xl text-[#f4f1e8]">Also on Fabrary</h2>
          <p className="mt-1 text-sm text-[#c8c2b4]">Tournament rows from Fabrary. The full 80 is not copied into the app yet.</p>
          <ul className="mt-3 flex flex-col gap-2">
            {more.map((hit) => (
              <li key={hit.id} className="rounded-card border border-[#33362c] bg-[#171910] px-4 py-3">
                <span className="block font-semibold text-[#f4f1e8]">{hit.hero}</span>
                <span className="mt-1 block text-sm text-[#c8c2b4]">
                  {hit.player} · {hit.name}
                </span>
                <a
                  href={`https://fabrary.net/decks/${hit.id}`}
                  className="mt-2 inline-block text-sm font-semibold text-[#c6ff3a]"
                >
                  Open on Fabrary
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
