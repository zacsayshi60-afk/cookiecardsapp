import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CHAMP_META } from "@/data/champ-meta";
import { CARD_BY_ID } from "@/data/catalog";
import { GALLERY } from "@/data/gallery";
import { META } from "@/data/meta";
import { riftGet, type ApiDeck, type ApiLegend, type ApiStats } from "@/lib/rift-api";
import { DomainDots, MascotLine, Note, Shell } from "@/components/shell";
import type { Domain } from "@/data/catalog";

export const Route = createFileRoute("/meta/")({ component: MetaPage });

type SortKey = "share" | "win";

function MetaPage() {
  const [sort, setSort] = useState<SortKey>("share");
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const rows = [...META]
    .filter((deck) => {
      if (!needle) return true;
      const legend = CARD_BY_ID[deck.legendId];
      return [deck.name, deck.tagline, deck.tier, legend?.name ?? ""].join(" ").toLowerCase().includes(needle);
    })
    .sort((a, b) => b[sort] - a[sort]);

  return (
    <Shell>
      <header className="px-4 pt-6">
        <h1 className="font-display text-4xl text-fg">Meta</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Tournament lists from the Riftbook desk, then the sketch lists you can copy into Build.
        </p>
      </header>
      <div className="mt-4 flex flex-col gap-3 px-4 pb-6">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search legends, lists, players"
          className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-base text-fg placeholder:text-faint"
          aria-label="Search meta"
        />
        <ChampionDecks query={needle} />
        <TournamentDesk query={needle} />
        <div className="flex gap-2">
          <SortChip on={sort === "share"} onClick={() => setSort("share")}>
            Sketch share
          </SortChip>
          <SortChip on={sort === "win"} onClick={() => setSort("win")}>
            Sketch wins
          </SortChip>
        </div>
        <h2 className="text-xl text-fg">Sketch lists</h2>
        <Note>These six are practice curves. The percents are not from a tournament.</Note>
        {rows.length === 0 ? <MascotLine>No sketch list matches that search.</MascotLine> : null}
        <ul className="flex flex-col gap-2">
          {rows.map((deck, index) => {
            const legend = CARD_BY_ID[deck.legendId];
            return (
              <li key={deck.id}>
                <Link
                  to="/meta/$deckId"
                  params={{ deckId: deck.id }}
                  className="block rounded-card border border-border bg-surface px-4 py-4"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="text-xs font-semibold tracking-widest text-faint uppercase">
                        {deck.tier} · {index + 1}
                      </span>
                      <span className="mt-1 block font-display text-2xl text-fg">{deck.name}</span>
                    </span>
                    <span className="text-right">
                      <span className="block font-display text-2xl text-primary tabular-nums">{deck.win}%</span>
                      <span className="text-xs text-faint">wins</span>
                    </span>
                  </span>
                  <span className="mt-2 flex items-center gap-2 text-sm text-muted">
                    <DomainDots domains={legend?.domains ?? []} size="sm" />
                    {legend?.name}
                  </span>
                  <span className="mt-2 block text-sm leading-relaxed text-fg">{deck.tagline}</span>
                  <span className="mt-3 flex justify-between text-xs text-faint">
                    <span>{deck.share}% of the sketch field</span>
                    <span className="tabular-nums">{deck.matches} sample games</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </Shell>
  );
}

function ChampionDecks({ query }: { query: string }) {
  const [id, setId] = useState(CHAMP_META[0].id);
  const searching = query.length > 0;
  const champs = searching
    ? CHAMP_META.filter((champ) =>
        [champ.name, champ.short, champ.tier, ...champ.lists.flatMap((deck) => [deck.name, deck.player, deck.event, deck.place])]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : CHAMP_META.filter((champ) => champ.id === id);
  const selected = CHAMP_META.find((item) => item.id === id) ?? CHAMP_META[0];

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-xl text-fg">Top decks by champion</h2>
        <p className="mt-1 text-xs text-faint">Every legend. Open one and the whole list is on the page.</p>
      </div>
      {searching ? null : (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {CHAMP_META.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setId(item.id)}
              className={
                item.id === selected.id
                  ? "inline-flex h-11 shrink-0 items-center rounded-full bg-primary px-3 text-sm font-semibold text-primary-fg"
                  : "inline-flex h-11 shrink-0 items-center rounded-full border border-border bg-surface px-3 text-sm font-semibold text-fg"
              }
            >
              {item.short}
            </button>
          ))}
        </div>
      )}
      {champs.length === 0 ? <MascotLine>No champion list matches that search.</MascotLine> : null}
      {champs.map((champ) => {
        const printed = legendCard(champ.name);
        const lists = searching
          ? champ.lists.filter((deck) =>
              [champ.name, champ.short, deck.name, deck.player, deck.event, deck.place].join(" ").toLowerCase().includes(query),
            )
          : champ.lists;
        return (
          <div key={champ.id} className="flex flex-col gap-2">
            {searching ? <h3 className="text-sm font-semibold text-muted">{champ.short}</h3> : null}
            <ul className="flex flex-col gap-2">
              {lists.map((deck, index) => (
                <li key={`${champ.id}-${champ.lists.indexOf(deck)}`}>
                  <Link
                    to="/meta/$deckId"
                    params={{ deckId: `champ-${champ.id}-${champ.lists.indexOf(deck)}` }}
                    className="block rounded-card border border-border bg-surface px-4 py-4"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="text-xs font-semibold tracking-widest text-faint uppercase">
                          {champ.tier ? `${champ.tier} · ` : ""}
                          {index + 1}
                        </span>
                        <span className="mt-1 block font-display text-2xl text-fg">{deck.name}</span>
                      </span>
                      <span className="text-right">
                        <span className="block font-display text-2xl text-primary">{deck.place}</span>
                        <span className="text-xs text-faint">result</span>
                      </span>
                    </span>
                    <span className="mt-2 flex items-center gap-2 text-sm text-muted">
                      <DomainDots domains={printed?.domains ?? []} size="sm" />
                      {champ.name}
                    </span>
                    <span className="mt-2 block text-sm leading-relaxed text-fg">
                      {deck.player} · {deck.event}
                    </span>
                    {champ.share > 0 ? (
                      <span className="mt-3 flex justify-between text-xs text-faint">
                        <span>{champ.share}% of the field</span>
                        <span className="tabular-nums">{champ.decks} decks</span>
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function TournamentDesk({ query }: { query: string }) {
  const [decks, setDecks] = useState<ApiDeck[] | null>(null);
  const [legends, setLegends] = useState<ApiLegend[] | null>(null);
  const [updated, setUpdated] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fieldSort, setFieldSort] = useState<SortKey>("share");

  async function load() {
    const [nextDecks, nextLegends, stats] = await Promise.all([
      riftGet<ApiDeck[]>("/api/v1/decks?limit=20"),
      riftGet<ApiLegend[]>("/api/v1/meta/legends"),
      riftGet<ApiStats>("/api/v1/stats"),
    ]);
    if (!nextDecks) {
      setOffline(true);
      return;
    }
    setOffline(false);
    setDecks(nextDecks);
    setLegends(nextLegends);
    setUpdated(stats?.last_sync?.finished_at ?? null);
  }

  useEffect(() => {
    let cancel = false;
    void load().then(() => {
      if (cancel) return;
    });
    return () => {
      cancel = true;
    };
  }, []);

  async function refresh() {
    setBusy(true);
    try {
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl text-fg">Radiance field</h2>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={busy}
          className="inline-flex h-11 items-center rounded-full border border-border bg-surface px-4 text-sm font-semibold text-fg disabled:opacity-60"
        >
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {offline ? (
        <Note>The tournament desk is offline. Sketch lists are still on this page.</Note>
      ) : !decks ? (
        <MascotLine>Opening the tournament desk…</MascotLine>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-muted">
            Radiance constructed. The bar is the share itself, so 13% is a short bar, not a full one.
            {updated ? ` Desk updated ${updated}.` : ""}
          </p>
          {legends && legends.length > 0 ? <FieldTable rows={legends} query={query} sort={fieldSort} onSort={setFieldSort} /> : null}
          <h2 className="text-xl text-fg">Tournament lists</h2>
          <ul className="flex flex-col gap-2">
            {decks
              .filter((deck) => deckMatches(deck, query))
              .map((deck) => {
              const printed = deck.legend ? legendCard(deck.legend) : undefined;
              return (
                <li key={deck.id}>
                  <Link
                    to="/meta/$deckId"
                    params={{ deckId: String(deck.id) }}
                    className="block rounded-card border border-border bg-surface px-4 py-4"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="text-xs font-semibold tracking-widest text-faint uppercase">
                          {deck.rank_label ?? deck.meta ?? "Event"}
                        </span>
                        <span className="mt-1 block font-display text-2xl text-fg">{deck.name}</span>
                      </span>
                      {deck.price_usd != null ? (
                        <span className="text-right">
                          <span className="block font-display text-2xl text-primary tabular-nums">
                            ${Math.round(deck.price_usd)}
                          </span>
                          <span className="text-xs text-faint">list</span>
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-2 flex items-center gap-2 text-sm text-muted">
                      <DomainDots domains={printed?.domains ?? []} size="sm" />
                      {deck.legend ?? "Legend"}
                      {deck.player_name ? ` · ${deck.player_name}` : ""}
                    </span>
                    <span className="mt-2 block text-xs text-faint">
                      {[deck.record, deck.event_date].filter(Boolean).join(" · ") || "Imported deck"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {decks.some((deck) => deckMatches(deck, query)) ? null : <MascotLine>No tournament list matches that search.</MascotLine>}
        </>
      )}
    </section>
  );
}

function deckMatches(deck: ApiDeck, query: string) {
  if (!query) return true;
  return [deck.name, deck.legend, deck.player_name, deck.rank_label, deck.meta]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function FieldTable({
  rows,
  query,
  sort,
  onSort,
}: {
  rows: ApiLegend[];
  query: string;
  sort: SortKey;
  onSort: (sort: SortKey) => void;
}) {
  const shown = rows
    .filter((row) => !query || row.legend.toLowerCase().includes(query))
    .sort((a, b) => {
      const left = sort === "share" ? (a.meta_share_pct ?? -1) : (a.win_rate_pct ?? -1);
      const right = sort === "share" ? (b.meta_share_pct ?? -1) : (b.win_rate_pct ?? -1);
      return right - left;
    });

  if (shown.length === 0) return <MascotLine>No legend matches that search.</MascotLine>;

  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <table className="w-full table-fixed text-left">
        <thead>
          <tr className="border-b border-border text-xs font-semibold tracking-widest text-faint uppercase">
            <th className="px-3 py-2 font-semibold">Legend</th>
            <th className="w-20 px-1 py-2 text-right font-semibold">
              <button type="button" onClick={() => onSort("share")} className={sort === "share" ? "inline-flex h-11 w-full items-center justify-end text-xs font-semibold text-primary uppercase" : "inline-flex h-11 w-full items-center justify-end text-xs font-semibold uppercase"}>
                Share
              </button>
            </th>
            <th className="w-20 px-3 py-2 text-right font-semibold">
              <button type="button" onClick={() => onSort("win")} className={sort === "win" ? "inline-flex h-11 w-full items-center justify-end text-xs font-semibold text-primary uppercase" : "inline-flex h-11 w-full items-center justify-end text-xs font-semibold uppercase"}>
                Wins
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {shown.map((row) => {
            const printed = legendCard(row.legend);
            const share = row.meta_share_pct ?? 0;
            const detail = [
              row.tier ? `${row.tier} tier` : null,
              `${row.total_decks ?? 0} decks`,
              `${row.top8_count ?? 0} top 8`,
              row.avg_price_usd != null ? `$${Math.round(row.avg_price_usd)}` : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <tr key={row.legend} className="border-b border-border align-top last:border-0">
                <td className="px-3 py-3">
                  <span className="block font-semibold text-fg">{row.legend}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                    <DomainDots domains={printed?.domains ?? []} size="sm" />
                    <span>{detail}</span>
                  </span>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-bg">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, share)}%` }} />
                  </span>
                </td>
                <td className="w-20 px-1 py-3 text-right font-display text-xl text-primary tabular-nums whitespace-nowrap">{share}%</td>
                <td className="w-20 px-3 py-3 text-right font-display text-xl text-fg tabular-nums whitespace-nowrap">
                  {row.win_rate_pct != null ? `${Math.round(row.win_rate_pct)}%` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function legendCard(name: string) {
  const key = name.trim().toLowerCase();
  const title = key.split(",").slice(1).join(",").trim();
  const legends = GALLERY.filter((card) => card.kind === "Legend" && !card.variation);
  const hit =
    legends.find((card) => card.name.toLowerCase() === key) ??
    legends.find((card) => title.length > 2 && card.name.toLowerCase().includes(title)) ??
    legends.find((card) => card.name.toLowerCase().startsWith(key.split(",")[0] ?? key));
  if (!hit) return undefined;
  return { domains: hit.domains.filter((item): item is Domain => item.length > 0) };
}

function SortChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        on
          ? "inline-flex h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-fg"
          : "inline-flex h-11 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-fg"
      }
    >
      {children}
    </button>
  );
}
