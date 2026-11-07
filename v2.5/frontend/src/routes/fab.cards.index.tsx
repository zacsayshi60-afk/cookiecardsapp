import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FAB_CARDS, type FabCard, type FabPitch } from "@/data/fab";
import { searchCardVault } from "@/lib/cardvault";

export const Route = createFileRoute("/fab/cards/")({ component: Library });

const PITCHES: Array<{ id: "All" | FabPitch; label: string }> = [
  { id: "All", label: "Any pitch" },
  { id: "red", label: "Red" },
  { id: "yellow", label: "Yellow" },
  { id: "blue", label: "Blue" },
  { id: "", label: "Hero / gear" },
];

function Library() {
  const [query, setQuery] = useState("");
  const [pitch, setPitch] = useState<(typeof PITCHES)[number]["id"]>("All");
  const [limit, setLimit] = useState(48);
  const [live, setLive] = useState<FabCard[] | null>(null);

  useEffect(() => {
    setLimit(48);
  }, [query, pitch]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setLive(null);
      return;
    }
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => {
      searchCardVault(q, ctrl.signal)
        .then((cards) => {
          if (!ctrl.signal.aborted) setLive(cards);
        })
        .catch(() => {
          if (!ctrl.signal.aborted) setLive(null);
        });
    }, 250);
    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const local = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAB_CARDS.filter((card) => {
      if (pitch !== "All" && card.pitch !== pitch) return false;
      if (!q) return true;
      return card.name.toLowerCase().includes(q) || card.type.toLowerCase().includes(q);
    });
  }, [query, pitch]);

  const vault = (live ?? []).filter((card) => (pitch === "All" ? true : card.pitch === pitch));
  const usingVault = query.trim().length >= 2 && live != null;
  const rows = usingVault ? vault : local;
  const visible = rows.slice(0, limit);

  return (
    <main className="px-4 pt-6 pb-20">
      <Link to="/fab" className="text-sm font-semibold text-[#c6ff3a]">
        Rathe Archive
      </Link>
      <h1 className="mt-2 font-display text-4xl">Cards</h1>
      <p className="mt-1 text-sm text-[#c8c2b4]">
        {usingVault ? `${rows.length} from CardVault.` : `${rows.length} cards saved with the decks. Search CardVault for the rest.`}
      </p>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search a card name"
        aria-label="Search Flesh and Blood cards"
        className="mt-4 h-11 w-full rounded-xl border border-[#33362c] bg-[#171910] px-3 text-base text-[#f4f1e8] placeholder:text-[#8d887c]"
      />
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        {PITCHES.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => setPitch(item.id)}
            className={
              pitch === item.id
                ? "inline-flex h-11 shrink-0 items-center rounded-full bg-[#c6ff3a] px-3 text-sm font-semibold text-black"
                : "inline-flex h-11 shrink-0 items-center rounded-full border border-[#33362c] px-3 text-sm font-semibold text-[#f4f1e8]"
            }
          >
            {item.label}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-[#c8c2b4]">Nothing under that filter.</p>
      ) : (
        <>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visible.map((card) => (
              <li key={card.id}>
                <Link to="/fab/cards/$cardId" params={{ cardId: card.id }} className="block">
                  <CardFace card={card} />
                  <span className="mt-2 block truncate text-sm font-semibold">{card.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-[#c8c2b4]">
                    {card.pitch ? `${card.pitch} · ` : ""}
                    {card.type}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {visible.length < rows.length ? (
            <button
              type="button"
              className="mt-4 h-11 w-full rounded-full bg-[#c6ff3a] text-sm font-semibold text-black"
              onClick={() => setLimit((count) => count + 48)}
            >
              Show more
            </button>
          ) : null}
        </>
      )}
    </main>
  );
}

function CardFace({ card }: { card: FabCard }) {
  const [failed, setFailed] = useState(false);
  if (!card.image || failed) {
    return (
      <span className="flex aspect-[5/7] items-end rounded-2xl border border-[#33362c] bg-[#171910] p-3 text-sm font-semibold">
        {card.name}
      </span>
    );
  }
  return (
    <img
      src={card.image}
      alt={card.name}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="aspect-[5/7] w-full rounded-2xl border border-[#33362c] object-cover"
    />
  );
}
