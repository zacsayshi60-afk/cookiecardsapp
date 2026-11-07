import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FAB_CARDS, type FabCard } from "@/data/fab";
import { loadVaultCard, parseVaultRoute } from "@/lib/cardvault";

export const Route = createFileRoute("/fab/cards/$cardId")({ component: CardPage });

function CardPage() {
  const { cardId } = Route.useParams();
  const saved = FAB_CARDS.find((item) => item.id === cardId);
  const [remote, setRemote] = useState<FabCard | null>(null);
  const [failed, setFailed] = useState(false);
  const vault = parseVaultRoute(cardId);

  useEffect(() => {
    if (saved || !vault) return;
    let live = true;
    loadVaultCard(vault.cardId, vault.pitch)
      .then((card) => {
        if (live) setRemote(card);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [saved, vault?.cardId, vault?.pitch]);

  const card = saved ?? remote;

  if (!card) {
    return (
      <main className="px-4 pt-6 pb-20">
        <Link to="/fab/cards" className="text-sm font-semibold text-[#c6ff3a]">
          Cards
        </Link>
        <p className="mt-4 text-base">
          {!vault ? "That card is not in this library." : failed ? "CardVault did not answer." : "Looking that card up."}
        </p>
      </main>
    );
  }

  return (
    <main className="px-4 pt-6 pb-20">
      <Link to="/fab/cards" className="text-sm font-semibold text-[#c6ff3a]">
        Cards
      </Link>
      {card.image ? (
        <img
          src={card.image}
          alt={card.name}
          referrerPolicy="no-referrer"
          className="mx-auto mt-3 aspect-[5/7] w-full max-w-sm rounded-2xl border border-[#33362c] object-cover"
        />
      ) : null}
      <h1 className="mt-4 font-display text-3xl">{card.name}</h1>
      <p className="mt-1 text-sm text-[#c8c2b4]">
        {card.pitch ? `${card.pitch} · ` : ""}
        {card.type}
        {card.cost ? ` · cost ${card.cost}` : ""}
        {card.power ? ` · power ${card.power}` : ""}
        {card.defense ? ` · defense ${card.defense}` : ""}
      </p>
      {card.text ? (
        <p className="mt-4 text-base leading-relaxed whitespace-pre-line">{card.text.replaceAll("**", "")}</p>
      ) : null}
    </main>
  );
}
