import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LEGENDS } from "@/data/catalog";
import { GALLERY } from "@/data/gallery";
import { META } from "@/data/meta";
import { hitsFor } from "@/data/places";
import { useCountry } from "@/lib/country";
import { CountryAsk } from "@/components/country-field";
import { analyze } from "@/lib/deck-math";
import { riftGet, type ApiDeck } from "@/lib/rift-api";
import { useDeskReady, useRift } from "@/lib/store";
import { DomainDots, Mascot, MascotLine, Note, Shell } from "@/components/shell";

export const Route = createFileRoute("/rift")({ component: Home });

function Home() {
  const ready = useDeskReady();
  const decks = useRift((state) => state.decks);
  const matches = useRift((state) => state.matches);
  const owned = useRift((state) => state.owned);
  const setActive = useRift((state) => state.setActive);
  const { country } = useCountry();
  const localHits = hitsFor(country, "rift");

  const pool = GALLERY;
  const seen = pool.filter((card) => (owned[card.id] ?? 0) > 0).length;
  const wins = matches.filter((match) => match.result === "W").length;
  const top = [...META].sort((a, b) => b.share - a.share).slice(0, 3);

  return (
    <Shell>
      <header className="flex items-start justify-between gap-4 px-4 pt-6">
        <div>
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">Riftbound desk</p>
          <h1 className="mt-1 font-display text-4xl text-fg italic">Riftbook</h1>
          <p className="mt-2 max-w-md text-base leading-relaxed text-muted">
            Card library, sketch meta, and the math on a 40. Built for a phone at the table.
          </p>
        </div>
        <Mascot size="lg" label="Riftbook mascot" />
      </header>

      <div className="mt-5 flex flex-col gap-4 px-4">
        <Note>
          The library and the sketch lists use printed cards. The win rates are still a sketch, not a tournament report.
        </Note>

        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-xl text-fg">Your lists</h2>
            <Link to="/build" className="text-sm font-semibold text-primary">
              Build
            </Link>
          </div>
          {!ready ? (
            <MascotLine>Opening the desk…</MascotLine>
          ) : decks.length === 0 ? (
            <Link
              to="/build"
              className="flex items-center gap-3 rounded-card border border-dashed border-border bg-surface px-4 py-4"
            >
              <Mascot size="md" />
              <span>
                <span className="block font-semibold text-fg">Start a 40</span>
                <span className="mt-1 block text-sm text-muted">Pick a legend. The checker watches copies, runes, and fields.</span>
              </span>
            </Link>
          ) : (
            <ul className="flex flex-col gap-2">
              {decks.slice(0, 3).map((deck) => {
                const legend = LEGENDS.find((card) => card.id === deck.legendId);
                const report = analyze(deck);
                return (
                  <li key={deck.id}>
                    <Link
                      to="/build"
                      onClick={() => setActive(deck.id)}
                      className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3"
                    >
                      <span>
                        <span className="block font-semibold text-fg">{deck.name}</span>
                        <span className="mt-1 flex items-center gap-2 text-sm text-muted">
                          <DomainDots domains={legend?.domains ?? []} size="sm" />
                          {legend?.champion ?? "Legend"} · {report.mainCount}/40
                        </span>
                      </span>
                      <span className={report.legal ? "text-sm text-ok" : "text-sm text-danger"}>
                        {report.legal ? "Legal" : "Open"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-xl text-fg">Popular local decks</h2>
          </div>
          <CountryAsk tone="rift" />
          {!country ? null : localHits.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No Riftbound lists filed for {country} yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {localHits.map((deck) => {
                const body = (
                  <>
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-fg">{deck.name}</span>
                      <span className="text-sm text-primary">{deck.place}</span>
                    </span>
                    <span className="mt-1 block text-sm text-muted">
                      {deck.player} · {deck.event}
                    </span>
                    <span className="mt-2 block text-sm leading-relaxed text-fg">{deck.line}</span>
                  </>
                );
                return (
                  <li key={deck.id}>
                    {deck.listId ? (
                      <Link
                        to="/meta/$deckId"
                        params={{ deckId: deck.listId }}
                        className="block rounded-card border border-border bg-surface px-4 py-3"
                      >
                        {body}
                      </Link>
                    ) : (
                      <div className="block rounded-card border border-border bg-surface px-4 py-3">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <TournamentStrip />

        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-xl text-fg">Sketch field</h2>
            <Link to="/meta" className="text-sm font-semibold text-primary">
              All lists
            </Link>
          </div>
          <ul className="flex flex-col gap-2">
            {top.map((deck) => {
              const legend = LEGENDS.find((card) => card.id === deck.legendId);
              return (
                <li key={deck.id}>
                  <Link
                    to="/meta/$deckId"
                    params={{ deckId: deck.id }}
                    className="block rounded-card border border-border bg-surface px-4 py-3"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-fg">{deck.name}</span>
                      <span className="text-sm tabular-nums text-primary">{deck.share}%</span>
                    </span>
                    <span className="mt-1 flex items-center gap-2 text-sm text-muted">
                      <DomainDots domains={legend?.domains ?? []} size="sm" />
                      {legend?.name} · {deck.win}% wins
                    </span>
                    <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-bg">
                      <span className="block h-full rounded-full bg-primary" style={{ width: `${deck.share * 4}%` }} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-faint">Shares and win rates are invented so the screen has a shape.</p>
        </section>

        <section className="grid grid-cols-3 gap-2">
          <Tile label="Logged" value={ready ? String(matches.length) : "—"} hint={ready && matches.length ? `${wins} wins` : "matches"} />
          <Tile label="Seen" value={ready ? `${seen}` : "—"} hint="cards owned" />
          <Tile label="Pool" value={String(GALLERY.length)} hint="printed cards" />
        </section>

        <section className="grid grid-cols-2 gap-2 pb-4">
          <Link to="/log" className="rounded-card border border-border bg-surface px-4 py-4">
            <p className="font-semibold text-fg">Log a match</p>
            <p className="mt-1 text-sm text-muted">Win rate by legend.</p>
          </Link>
          <Link to="/rules" className="rounded-card border border-border bg-surface px-4 py-4">
            <p className="font-semibold text-fg">Rules crib</p>
            <p className="mt-1 text-sm text-muted">8 points, 12 runes, keywords.</p>
          </Link>
        </section>
      </div>
    </Shell>
  );
}

function TournamentStrip() {
  const [decks, setDecks] = useState<ApiDeck[] | null>(null);

  useEffect(() => {
    let cancel = false;
    void riftGet<ApiDeck[]>("/api/v1/decks?limit=3").then((rows) => {
      if (!cancel && rows && rows.length > 0) setDecks(rows);
    });
    return () => {
      cancel = true;
    };
  }, []);

  if (!decks) return null;

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-xl text-fg">Tournament desk</h2>
        <Link to="/meta" className="text-sm font-semibold text-primary">
          Meta
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {decks.map((deck) => (
          <li key={deck.id}>
            <Link
              to="/meta/$deckId"
              params={{ deckId: String(deck.id) }}
              className="block rounded-card border border-border bg-surface px-4 py-3"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="font-semibold text-fg">{deck.name}</span>
                <span className="text-sm text-primary">{deck.rank_label ?? deck.meta ?? "Event"}</span>
              </span>
              <span className="mt-1 block text-sm text-muted">
                {deck.legend ?? "Legend"}
                {deck.player_name ? ` · ${deck.player_name}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-card border border-border bg-surface px-3 py-3">
      <p className="text-xs text-faint">{label}</p>
      <p className="mt-1 font-display text-2xl text-fg tabular-nums">{value}</p>
      <p className="text-xs text-muted">{hint}</p>
    </div>
  );
}
