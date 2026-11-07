import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MAGIC_CARDS, type MagicCard } from "@/data/magic";

export const Route = createFileRoute("/magic/cards/")({ component: Library });

const COLORS = [
  { id: "W", label: "White" },
  { id: "U", label: "Blue" },
  { id: "B", label: "Black" },
  { id: "R", label: "Red" },
  { id: "G", label: "Green" },
  { id: "C", label: "Colorless" },
];

function Library() {
  const [query, setQuery] = useState("");
  const [color, setColor] = useState("All");
  const [limit, setLimit] = useState(48);

  useEffect(() => {
    setLimit(48);
  }, [query, color]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MAGIC_CARDS.filter((card) => {
      if (color === "C" && card.colors.length > 0) return false;
      if (color !== "All" && color !== "C" && !card.colors.includes(color)) return false;
      if (!q) return true;
      return card.name.toLowerCase().includes(q) || card.type.toLowerCase().includes(q);
    });
  }, [query, color]);

  const visible = rows.slice(0, limit);

  return (
    <main className="px-4 pt-6 pb-20">
      <Link to="/magic" className="text-sm font-semibold text-[#c6ff3a]">
        Magisterium
      </Link>
      <h1 className="mt-2 font-display text-4xl">Cards</h1>
      <p className="mt-1 text-sm text-[#c8c2b4]">{rows.length} cards. Picture, then the name.</p>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search a card name"
        aria-label="Search Magic cards"
        className="mt-4 h-11 w-full rounded-xl border border-[#33362c] bg-[#171910] px-3 text-base text-[#f4f1e8] placeholder:text-[#8d887c]"
      />
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        <ColorChip on={color === "All"} onClick={() => setColor("All")}>
          Any color
        </ColorChip>
        {COLORS.map((item) => (
          <ColorChip key={item.id} on={color === item.id} onClick={() => setColor(item.id)}>
            {item.label}
          </ColorChip>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-[#c8c2b4]">Nothing under that filter.</p>
      ) : (
        <>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visible.map((card) => (
              <li key={card.id}>
                <Link to="/magic/cards/$cardId" params={{ cardId: card.id }} className="block">
                  <CardFace card={card} />
                  <span className="mt-2 block truncate text-sm font-semibold">{card.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-[#c8c2b4]">
                    {card.cost ? `${card.cost} · ` : ""}
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

function ColorChip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        on
          ? "inline-flex h-11 shrink-0 items-center rounded-full bg-[#c6ff3a] px-3 text-sm font-semibold text-black"
          : "inline-flex h-11 shrink-0 items-center rounded-full border border-[#33362c] px-3 text-sm font-semibold text-[#f4f1e8]"
      }
    >
      {children}
    </button>
  );
}

function CardFace({ card }: { card: MagicCard }) {
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
