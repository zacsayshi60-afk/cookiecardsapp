import { createFileRoute, Link } from "@tanstack/react-router";
import { CountryAsk } from "@/components/country-field";
import { MAGIC_BY_NAME, MAGIC_DECKS } from "@/data/magic";
import { MAGIC_META } from "@/data/magic-meta";
import { hitsFor } from "@/data/places";
import { useCountry } from "@/lib/country";

export const Route = createFileRoute("/magic/")({ component: Magisterium });

function Magisterium() {
  const top = MAGIC_DECKS.slice(0, 8);
  const { country } = useCountry();
  const localHits = hitsFor(country, "magic");

  return (
    <main className="px-4 pt-2 pb-4">
      <p className="text-xs font-semibold tracking-widest text-[#c6ff3a] uppercase">Magic desk</p>
      <h1 className="mt-1 font-display text-4xl text-[#f4f1e8]">Magisterium</h1>
      <p className="mt-2 max-w-md text-base leading-relaxed text-[#c8c2b4]">
        Standard. The whole list is on the page, with pictures.
      </p>

      <section className="mt-5">
        <h2 className="text-xl text-[#f4f1e8]">Standard meta</h2>
        <p className="mt-1 text-sm text-[#c8c2b4]">mtgdecks.net, 28 Oct 2026. Share, win rate, and how many lists.</p>
        <ul className="mt-3 flex flex-col gap-2">
          {MAGIC_META.map((row) => (
            <li key={row.name} className="rounded-card border border-[#33362c] bg-[#171910] px-4 py-3">
              <span className="flex items-center justify-between gap-3">
                <span className="font-semibold text-[#f4f1e8]">{row.name}</span>
                <span className="text-sm text-[#c6ff3a]">{row.share}</span>
              </span>
              <span className="mt-1 block text-sm text-[#c8c2b4]">
                Tier {row.tier} · {row.win} win · {row.decks} decks
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-xl text-[#f4f1e8]">Popular decks</h2>
          <Link to="/magic/decks" className="text-sm font-semibold text-[#c6ff3a]">
            All lists
          </Link>
        </div>
        <ul className="flex flex-col gap-2">
          {top.map((deck) => {
            const face = deck.cards.map((entry) => MAGIC_BY_NAME[entry.name]).find((card) => card?.image);
            const count = deck.cards.reduce((sum, card) => sum + card.count, 0);
            const side = (deck.side ?? []).reduce((sum, card) => sum + card.count, 0);
            return (
              <li key={deck.id}>
                <Link
                  to="/magic/decks/$deckId"
                  params={{ deckId: deck.id }}
                  className="flex items-center gap-3 rounded-card border border-[#33362c] bg-[#171910] px-3 py-3"
                >
                  {face?.image ? (
                    <img src={face.image} alt="" className="h-20 w-14 rounded-lg object-cover" />
                  ) : null}
                  <span className="min-w-0">
                    <span className="block font-semibold text-[#f4f1e8]">{deck.name}</span>
                    <span className="mt-1 block text-sm text-[#c8c2b4]">
                      {deck.format} · {count} cards{side ? ` · ${side} side` : ""}
                    </span>
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
          <CountryAsk tone="magic" />
        </div>
        {!country ? null : localHits.length === 0 ? (
          <p className="mt-3 text-sm text-[#c8c2b4]">No Magic lists filed for {country} yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {localHits.map((deck) => (
              <li key={deck.id} className="rounded-card border border-[#33362c] bg-[#171910] px-4 py-3">
                <span className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-[#f4f1e8]">{deck.name}</span>
                  <span className="text-sm text-[#c6ff3a]">{deck.place}</span>
                </span>
                <span className="mt-1 block text-sm text-[#c8c2b4]">
                  {deck.player} · {deck.event}
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-[#f4f1e8]">{deck.line}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
