import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CARD_BY_ID, type Domain } from "@/data/catalog";
import { CHAMP_META, type FiledBoard } from "@/data/champ-meta";
import { localById, type LocalDeck } from "@/data/local-decks";
import { GALLERY, type GalleryCard } from "@/data/gallery";
import { metaById, type MetaDeck } from "@/data/meta";
import { analyze } from "@/lib/deck-math";
import { riftGet, type ApiDeckDetail } from "@/lib/rift-api";
import { useRift } from "@/lib/store";
import { DeckStats, IssueList } from "@/components/deck-stats";
import { cardLine, DeckLine, DomainDots, Mascot, MascotLine, Shell } from "@/components/shell";

export const Route = createFileRoute("/meta/$deckId")({ component: MetaDetail });

function idRow(id: string) {
  const card = CARD_BY_ID[id];
  const gallery = GALLERY.find((item) => item.id === id);
  return {
    id,
    name: card?.name ?? gallery?.name ?? id,
    image: card?.image || gallery?.image,
    line: card ? cardLine(card) : gallery?.kind || undefined,
  };
}

function MetaDetail() {
  const { deckId } = Route.useParams();
  const local = localById(deckId);
  if (local) return <LocalDetail deck={local} />;
  const champ = champDeck(deckId);
  if (champ) return <ChampDetail champ={champ.champ} deck={champ.deck} rank={champ.rank} />;
  if (/^\d+$/.test(deckId)) return <ImportedDetail id={Number(deckId)} />;
  const deck = metaById(deckId);
  if (!deck) {
    return (
      <Shell>
        <div className="px-4 pt-6">
          <h1 className="font-display text-3xl text-fg">List not in the sketch</h1>
          <Link to="/meta" className="mt-4 inline-flex text-sm font-semibold text-primary">
            Back to meta
          </Link>
        </div>
      </Shell>
    );
  }
  return <SketchDetail deck={deck} />;
}

function ImportedDetail({ id }: { id: number }) {
  const [deck, setDeck] = useState<ApiDeckDetail | null | undefined>(undefined);

  useEffect(() => {
    let cancel = false;
    void riftGet<ApiDeckDetail>(`/api/v1/decks/${id}`).then((row) => {
      if (!cancel) setDeck(row);
    });
    return () => {
      cancel = true;
    };
  }, [id]);

  if (deck === undefined) {
    return (
      <Shell>
        <div className="px-4 pt-6">
          <MascotLine>Opening the list…</MascotLine>
        </div>
      </Shell>
    );
  }
  if (!deck) {
    return (
      <Shell>
        <div className="flex items-center gap-3 px-4 pt-6">
          <Mascot size="md" />
          <div>
            <h1 className="font-display text-3xl text-fg">List not on the desk</h1>
            <Link to="/meta" className="mt-2 inline-flex h-11 items-center text-sm font-semibold text-primary">
              Back to meta
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  const buckets: Array<[string, typeof deck.cards]> = [
    ["Legend", deck.cards.filter((card) => card.section === "legend")],
    ["Champion", deck.cards.filter((card) => card.section === "champion")],
    ["MainDeck", deck.cards.filter((card) => card.section === "unit" || card.section === "spell" || card.section === "gear")],
    ["Battlefields", deck.cards.filter((card) => card.section === "battlefields")],
    ["Rune Pool", deck.cards.filter((card) => card.section === "runes")],
    ["Sideboard", deck.cards.filter((card) => card.section === "sideboard")],
  ];

  return (
    <Shell>
      <div className="flex flex-col gap-4 px-4 pt-5 pb-6">
        <Link to="/meta" className="text-sm font-semibold text-primary">
          Meta
        </Link>
        <header>
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">
            {deck.rank_label ?? "Tournament list"}
            {deck.record ? ` · ${deck.record}` : ""}
          </p>
          <h1 className="mt-1 font-display text-4xl text-fg">{deck.name}</h1>
          <p className="mt-2 text-sm text-muted">
            {deck.legend ?? "Legend"}
            {deck.player_name ? ` · ${deck.player_name}` : ""}
          </p>
          <p className="mt-2 text-sm text-faint">
            {[deck.meta, deck.event_date, deck.price_usd != null ? `$${deck.price_usd.toFixed(2)}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </header>
        {buckets.map(([title, rows]) =>
          rows.length ? (
          <section key={title}>
            <h2 className="text-xl text-fg">{title}</h2>
            <ul className="mt-2 flex flex-col gap-1">
              {rows.map((row) => {
                const printed = matchPrinted(row.card_name);
                const image = printed?.image || row.image_url || undefined;
                const body = (
                  <DeckLine
                    image={image}
                    count={row.quantity}
                    name={row.card_name}
                    line={[printed ? cardLineFromGallery(printed) : null, row.price_usd != null ? `$${row.price_usd.toFixed(2)}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                );
                return (
                  <li key={`${title}-${row.card_name}`}>
                    {printed ? (
                      <Link to="/cards/$cardId" params={{ cardId: printed.id }}>
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
          ) : null,
        )}
      </div>
    </Shell>
  );
}

function matchPrinted(name: string): GalleryCard | undefined {
  const key = name.trim().toLowerCase();
  const exact =
    GALLERY.find((card) => card.name.toLowerCase() === key && !card.variation) ??
    GALLERY.find((card) => card.name.toLowerCase() === key);
  if (exact) return exact;
  const title = key.split(",").pop()?.trim();
  if (!title || title === key) return undefined;
  return (
    GALLERY.find((card) => card.kind === "Legend" && card.name.toLowerCase() === title && !card.variation) ??
    GALLERY.find((card) => card.kind === "Legend" && card.name.toLowerCase() === title)
  );
}

function cardLineFromGallery(card: GalleryCard): string {
  const energy = card.energy != null ? ` · ${card.energy}` : "";
  return `${card.kind || "Card"}${energy}`;
}

function runePrint(domain: string): GalleryCard | undefined {
  return GALLERY.find((card) => card.kind === "Rune" && card.name === `${domain} Rune` && !card.variation);
}

function RuneList({ runes }: { runes: Partial<Record<Domain, number>> }) {
  const rows = (Object.entries(runes) as Array<[Domain, number | undefined]>).filter((entry): entry is [Domain, number] => Boolean(entry[1]));
  if (!rows.length) return null;
  return (
    <section>
      <h2 className="text-xl text-fg">Rune Pool</h2>
      <ul className="mt-2 flex flex-col gap-1">
        {rows.map(([domain, count]) => {
          const card = runePrint(domain);
          const line = <DeckLine image={card?.image} count={count} name={card?.name ?? `${domain} Rune`} line={domain} />;
          return (
            <li key={domain}>
              {card ? (
                <Link to="/cards/$cardId" params={{ cardId: card.id }}>
                  {line}
                </Link>
              ) : (
                line
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function LocalDetail({ deck }: { deck: LocalDeck }) {
  const legend = CARD_BY_ID[deck.legendId];
  const main = Object.entries(deck.main)
    .map(([id, copies]) => ({ card: CARD_BY_ID[id], copies, id }))
    .filter((row) => row.card && row.id !== deck.chosenId)
    .sort((a, b) => a.card!.energy - b.card!.energy || a.card!.name.localeCompare(b.card!.name));
  const chosen = CARD_BY_ID[deck.chosenId];
  const chosenCount = deck.main[deck.chosenId] ?? 1;
  const side = Object.entries(deck.side)
    .map(([id, copies]) => ({ card: CARD_BY_ID[id], copies }))
    .filter((row) => row.card);

  return (
    <Shell>
      <div className="flex flex-col gap-4 px-4 pt-5 pb-6">
        <Link to="/rift" className="text-sm font-semibold text-primary">
          Riftbook
        </Link>
        <header>
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">
            Local list · {deck.place}
          </p>
          <h1 className="mt-1 font-display text-4xl text-fg">{deck.name}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted">
            <DomainDots domains={legend?.domains ?? []} />
            {legend?.name}
          </p>
          <p className="mt-1 text-sm text-muted">
            {deck.player} · {deck.event}
          </p>
          <p className="mt-3 text-base leading-relaxed text-fg">{deck.pilot}</p>
        </header>
        {legend ? (
          <section>
            <h2 className="text-xl text-fg">Legend</h2>
            <ul className="mt-2">
              <li>
                <Link to="/cards/$cardId" params={{ cardId: legend.id }}>
                  <DeckLine image={legend.image} count={1} name={legend.name} line="Legend" />
                </Link>
              </li>
            </ul>
          </section>
        ) : null}
        {chosen ? (
          <section>
            <h2 className="text-xl text-fg">Champion</h2>
            <ul className="mt-2">
              <li>
                <Link to="/cards/$cardId" params={{ cardId: chosen.id }}>
                  <DeckLine image={chosen.image} count={chosenCount} name={chosen.name} line="Champion" />
                </Link>
              </li>
            </ul>
          </section>
        ) : null}
        <section>
          <h2 className="text-xl text-fg">MainDeck</h2>
          <ul className="mt-2 flex flex-col gap-1">
            {main.map(({ card, copies }) =>
              card ? (
                <li key={card.id}>
                  <Link to="/cards/$cardId" params={{ cardId: card.id }}>
                    <DeckLine image={card.image} count={copies} name={card.name} line={cardLine(card)} />
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
        </section>
        <section>
          <h2 className="text-xl text-fg">Battlefields</h2>
          <ul className="mt-2 flex flex-col gap-1">
            {deck.battlefields.map((id) => {
              const card = CARD_BY_ID[id];
              return (
                <li key={id}>
                  <Link to="/cards/$cardId" params={{ cardId: id }}>
                    <DeckLine image={card?.image} count={1} name={card?.name ?? id} line="Battlefield" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
        <RuneList runes={deck.runes} />
        {side.length > 0 ? (
          <section>
            <h2 className="text-xl text-fg">Sideboard</h2>
            <ul className="mt-2 flex flex-col gap-1">
              {side.map(({ card, copies }) =>
                card ? (
                  <li key={card.id}>
                    <Link to="/cards/$cardId" params={{ cardId: card.id }}>
                      <DeckLine image={card.image} count={copies} name={card.name} line={cardLine(card)} />
                    </Link>
                  </li>
                ) : null,
              )}
            </ul>
          </section>
        ) : null}
      </div>
    </Shell>
  );
}

function BoardView({ board }: { board: FiledBoard }) {
  const blocks = [
    ["Legend", board.legend],
    ["Champion", board.champion],
    ["MainDeck", board.main],
    ["Battlefields", board.battlefields],
    ["Rune Pool", board.runes],
    ["Sideboard", board.side],
  ] as const;
  return (
    <>
      {blocks.map(([title, rows]) =>
        rows.length ? (
          <section key={title}>
            <h2 className="text-xl text-fg">{title}</h2>
            <ul className="mt-2 flex flex-col gap-1">
              {rows.map((row) => {
                const printed = idRow(row.id);
                const line = <DeckLine image={printed.image} count={row.count} name={printed.name} line={printed.line} />;
                return (
                  <li key={`${title}-${row.id}`}>
                    <Link to="/cards/$cardId" params={{ cardId: row.id }}>
                      {line}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null,
      )}
    </>
  );
}

function champDeck(deckId: string) {
  const match = /^champ-(.+)-(\d+)$/.exec(deckId);
  if (!match) return null;
  const champ = CHAMP_META.find((item) => item.id === match[1]);
  const deck = champ?.lists[Number(match[2])];
  if (!champ || !deck) return null;
  return { champ, deck, rank: Number(match[2]) + 1 };
}

function ChampDetail({
  champ,
  deck,
  rank,
}: {
  champ: (typeof CHAMP_META)[number];
  deck: (typeof CHAMP_META)[number]["lists"][number];
  rank: number;
}) {
  const printed = legendDomains(champ.name);
  return (
    <Shell>
      <div className="flex flex-col gap-4 px-4 pt-5 pb-6">
        <Link to="/meta" className="text-sm font-semibold text-primary">
          Meta
        </Link>
        <header>
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">
            {champ.tier ? `${champ.tier} tier · ` : ""}list {rank}
          </p>
          <h1 className="mt-1 font-display text-4xl text-fg">{deck.name}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted">
            <DomainDots domains={printed} />
            {champ.name}
          </p>
          <p className="mt-3 text-base leading-relaxed text-fg">
            {deck.player}
            {deck.event ? ` · ${deck.event}` : ""}
          </p>
        </header>
        {champ.share > 0 ? (
          <dl className="grid grid-cols-3 gap-2">
            <Cell label="Result" value={deck.place} />
            <Cell label="Share" value={`${champ.share}%`} />
            <Cell label="Decks" value={String(champ.decks)} />
          </dl>
        ) : null}
        {deck.board ? <BoardView board={deck.board} /> : <p className="text-sm text-muted">This event's 40 is not filed in the book yet.</p>}
      </div>
    </Shell>
  );
}

function legendDomains(name: string): Domain[] {
  const key = name.trim().toLowerCase();
  const legends = GALLERY.filter((card) => card.kind === "Legend" && !card.variation);
  const hit =
    legends.find((card) => card.name.toLowerCase() === key) ??
    legends.find((card) => card.name.toLowerCase().startsWith(key.split(",")[0] ?? key));
  return (hit?.domains ?? []).filter((item): item is Domain => item.length > 0);
}

function SketchDetail({ deck }: { deck: MetaDeck }) {
  const navigate = useNavigate();
  const cloneMeta = useRift((state) => state.cloneMeta);
  const legend = CARD_BY_ID[deck.legendId];
  const report = analyze(deck);
  const chosen = deck.chosenId ? CARD_BY_ID[deck.chosenId] : undefined;
  const rows = Object.entries(deck.main)
    .map(([id, copies]) => ({ card: CARD_BY_ID[id], copies }))
    .filter((row) => row.card && row.card.id !== deck.chosenId)
    .sort((a, b) => a.card!.energy - b.card!.energy || a.card!.name.localeCompare(b.card!.name));
  const side = Object.entries(deck.side)
    .map(([id, copies]) => ({ card: CARD_BY_ID[id], copies }))
    .filter((row) => row.card);

  return (
    <Shell>
      <div className="flex flex-col gap-4 px-4 pt-5 pb-6">
        <Link to="/meta" className="text-sm font-semibold text-primary">
          Sketch meta
        </Link>
        <header>
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">{deck.tier} tier sketch</p>
          <h1 className="mt-1 font-display text-4xl text-fg">{deck.name}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted">
            <DomainDots domains={legend?.domains ?? []} />
            {legend?.name}
          </p>
          <p className="mt-3 text-base leading-relaxed text-fg">{deck.pilot}</p>
        </header>
        <dl className="grid grid-cols-3 gap-2">
          <Cell label="Win" value={`${deck.win}%`} />
          <Cell label="Share" value={`${deck.share}%`} />
          <Cell label="Games" value={String(deck.matches)} />
        </dl>
        <button
          type="button"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-fg"
          onClick={() => {
            const id = cloneMeta(deck.id);
            if (id) void navigate({ to: "/build" });
          }}
        >
          Copy into Build
        </button>
        <IssueList analysis={report} />
        <section>
          <h2 className="text-xl text-fg">Legend</h2>
          <ul className="mt-2">
            {legend ? (
              <li>
                <Link to="/cards/$cardId" params={{ cardId: legend.id }}>
                  <DeckLine image={legend.image} count={1} name={legend.name} line="Legend" />
                </Link>
              </li>
            ) : null}
          </ul>
        </section>
        {chosen ? (
          <section>
            <h2 className="text-xl text-fg">Champion</h2>
            <ul className="mt-2">
              <li>
                <Link to="/cards/$cardId" params={{ cardId: chosen.id }}>
                  <DeckLine
                    image={chosen.image}
                    count={deck.chosenId ? (deck.main[deck.chosenId] ?? 1) : 1}
                    name={chosen.name}
                    line="Champion"
                  />
                </Link>
              </li>
            </ul>
          </section>
        ) : null}
        <section>
          <h2 className="text-xl text-fg">MainDeck</h2>
          <ul className="mt-2 flex flex-col gap-1">
            {rows.map(({ card, copies }) =>
              card ? (
                <li key={card.id}>
                  <Link to="/cards/$cardId" params={{ cardId: card.id }}>
                    <DeckLine image={card.image} count={copies} name={card.name} line={cardLine(card)} />
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
        </section>
        <section>
          <h2 className="text-xl text-fg">Battlefields</h2>
          <ul className="mt-2 flex flex-col gap-1">
            {deck.battlefields.map((id) => {
              const card = CARD_BY_ID[id];
              return (
                <li key={id}>
                  <Link to="/cards/$cardId" params={{ cardId: id }}>
                    <DeckLine image={card?.image} count={1} name={card?.name ?? id} line="Battlefield" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
        <RuneList runes={deck.runes} />
        {side.length > 0 ? (
          <section>
            <h2 className="text-xl text-fg">Sideboard</h2>
            <ul className="mt-2 flex flex-col gap-1">
              {side.map(({ card, copies }) =>
                card ? (
                  <li key={card.id}>
                    <Link to="/cards/$cardId" params={{ cardId: card.id }}>
                      <DeckLine image={card.image} count={copies} name={card.name} line={cardLine(card)} />
                    </Link>
                  </li>
                ) : null,
              )}
            </ul>
          </section>
        ) : null}
        <DeckStats analysis={report} main={deck.main} />
      </div>
    </Shell>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-surface px-3 py-3">
      <dt className="text-xs text-faint">{label}</dt>
      <dd className="mt-1 font-display text-2xl text-primary tabular-nums">{value}</dd>
    </div>
  );
}
