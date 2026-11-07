import { createFileRoute, Link } from "@tanstack/react-router";
import { CountryAsk } from "@/components/country-field";

export const Route = createFileRoute("/")({
  component: CardBook,
  head: () => ({
    meta: [{ title: "CardBook" }, { name: "theme-color", content: "#000000" }],
  }),
});

function CardBook() {
  return (
    <main className="min-h-dvh bg-black px-5 pt-10 pb-8 text-[#c6ff3a]">
      <p className="text-xs font-semibold tracking-[0.22em] uppercase">Front page</p>
      <h1 className="mt-2 font-display text-6xl leading-none text-[#c6ff3a]">CardBook</h1>
      <p className="mt-3 max-w-xs text-lg leading-snug text-[#c6ff3a]">the all in one card app</p>

      <div className="mt-8">
        <CountryAsk tone="front" />
      </div>

      <div className="mt-10 flex flex-col gap-4">
        <Link
          to="/rift"
          className="block rounded-3xl border-2 border-[#c6ff3a] bg-black px-5 py-6 text-[#c6ff3a]"
        >
          <p className="text-xs font-semibold tracking-[0.18em] uppercase">Section</p>
          <h2 className="mt-1 font-display text-4xl text-[#c6ff3a]">Riftbook</h2>
          <p className="mt-2 text-base leading-snug text-[#c6ff3a]">
            Riftbound library, sketch meta, and the math on a 40.
          </p>
        </Link>
        <Link
          to="/magic"
          className="block rounded-3xl border-2 border-[#c6ff3a] bg-black px-5 py-6 text-[#c6ff3a]"
        >
          <p className="text-xs font-semibold tracking-[0.18em] uppercase">Section</p>
          <h2 className="mt-1 font-display text-4xl text-[#c6ff3a]">Magisterium</h2>
          <p className="mt-2 text-base leading-snug text-[#c6ff3a]">
            Magic: The Gathering card names, pictures, and popular decks.
          </p>
        </Link>
        <Link
          to="/fab"
          className="block rounded-3xl border-2 border-[#c6ff3a] bg-black px-5 py-6 text-[#c6ff3a]"
        >
          <p className="text-xs font-semibold tracking-[0.18em] uppercase">Section</p>
          <h2 className="mt-1 font-display text-4xl text-[#c6ff3a]">Rathe Archive</h2>
          <p className="mt-2 text-base leading-snug text-[#c6ff3a]">
            Flesh and Blood decks from Fabrary events, pictures from CardVault.
          </p>
        </Link>
      </div>
    </main>
  );
}
