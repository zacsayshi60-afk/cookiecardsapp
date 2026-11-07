import { createFileRoute, Link } from "@tanstack/react-router";
import { MAGIC_CARDS } from "@/data/magic";

export const Route = createFileRoute("/magic/cards/$cardId")({ component: CardPage });

function CardPage() {
  const { cardId } = Route.useParams();
  const card = MAGIC_CARDS.find((item) => item.id === cardId);

  if (!card) {
    return (
      <main className="px-4 pt-6 pb-20">
        <Link to="/magic/cards" className="text-sm font-semibold text-[#c6ff3a]">
          Cards
        </Link>
        <p className="mt-4 text-base">That card is not in this library.</p>
      </main>
    );
  }

  return (
    <main className="px-4 pt-6 pb-20">
      <Link to="/magic/cards" className="text-sm font-semibold text-[#c6ff3a]">
        Cards
      </Link>
      <img
        src={card.image}
        alt={card.name}
        referrerPolicy="no-referrer"
        className="mx-auto mt-3 aspect-[5/7] w-full max-w-sm rounded-2xl border border-[#33362c] object-cover"
      />
      <h1 className="mt-4 font-display text-3xl">{card.name}</h1>
      <p className="mt-1 text-sm text-[#c8c2b4]">
        {card.cost ? `${card.cost} · ` : ""}
        {card.type}
        {card.rarity ? ` · ${card.rarity}` : ""}
        {card.set ? ` · ${card.set}` : ""}
      </p>
      {card.text ? <p className="mt-4 text-base leading-relaxed whitespace-pre-line">{card.text}</p> : null}
    </main>
  );
}
