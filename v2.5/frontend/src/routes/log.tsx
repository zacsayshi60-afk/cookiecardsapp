import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LEGENDS } from "@/data/catalog";
import { useDeskReady, useRift } from "@/lib/store";
import { DomainDots, MascotLine, Shell } from "@/components/shell";

export const Route = createFileRoute("/log")({ component: LogPage });

function LogPage() {
  const ready = useDeskReady();
  const decks = useRift((state) => state.decks);
  const matches = useRift((state) => state.matches);
  const addMatch = useRift((state) => state.addMatch);
  const removeMatch = useRift((state) => state.removeMatch);
  const [deckId, setDeckId] = useState<string>("");
  const [opp, setOpp] = useState(LEGENDS[0]?.id ?? "");
  const [note, setNote] = useState("");

  const wins = matches.filter((match) => match.result === "W").length;
  const byOpp = new Map<string, { w: number; l: number }>();
  for (const match of matches) {
    const row = byOpp.get(match.oppLegendId) ?? { w: 0, l: 0 };
    if (match.result === "W") row.w += 1;
    else row.l += 1;
    byOpp.set(match.oppLegendId, row);
  }

  return (
    <Shell>
      <div className="flex flex-col gap-4 px-4 pt-6 pb-6">
        <header>
          <h1 className="font-display text-4xl text-fg">Match log</h1>
          <div className="mt-2 text-sm text-muted">
            {ready ? `${wins}–${matches.length - wins} across ${matches.length} games.` : <MascotLine>Opening the desk…</MascotLine>}
          </div>
        </header>

        <form
          className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!opp) return;
            addMatch({ deckId: deckId || null, oppLegendId: opp, result: "W", note: note.trim() });
            setNote("");
          }}
        >
          <label className="text-xs font-semibold tracking-widest text-faint uppercase">
            Your list
            <select
              value={deckId}
              onChange={(event) => setDeckId(event.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-border bg-bg px-3 text-base font-medium tracking-normal text-fg normal-case"
            >
              <option value="">Not tied to a list</option>
              {decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold tracking-widest text-faint uppercase">
            Opponent legend
            <select
              value={opp}
              onChange={(event) => setOpp(event.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-border bg-bg px-3 text-base font-medium tracking-normal text-fg normal-case"
            >
              {LEGENDS.map((legend) => (
                <option key={legend.id} value={legend.id}>
                  {legend.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold tracking-widest text-faint uppercase">
            Note
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Mulligan, battlefield, what folded"
              className="mt-1 h-11 w-full rounded-xl border border-border bg-bg px-3 text-base font-medium tracking-normal text-fg normal-case placeholder:text-faint"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-fg"
            >
              Win
            </button>
            <button
              type="button"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-bg text-sm font-semibold text-fg"
              onClick={() => {
                if (!opp) return;
                addMatch({ deckId: deckId || null, oppLegendId: opp, result: "L", note: note.trim() });
                setNote("");
              }}
            >
              Loss
            </button>
          </div>
        </form>

        {byOpp.size > 0 ? (
          <section>
            <h2 className="text-xl text-fg">By opponent</h2>
            <ul className="mt-2 flex flex-col gap-2">
              {[...byOpp.entries()]
                .sort((a, b) => b[1].w + b[1].l - (a[1].w + a[1].l))
                .map(([id, row]) => {
                  const legend = LEGENDS.find((card) => card.id === id);
                  const games = row.w + row.l;
                  return (
                    <li key={id} className="flex items-center justify-between rounded-card border border-border bg-surface px-4 py-3">
                      <span>
                        <span className="flex items-center gap-2 font-medium text-fg">
                          <DomainDots domains={legend?.domains ?? []} size="sm" />
                          {legend?.champion ?? "Unknown"}
                        </span>
                        <span className="text-xs text-muted">{legend?.domains.join(" · ")}</span>
                      </span>
                      <span className="text-right">
                        <span className="block font-display text-xl text-fg tabular-nums">
                          {row.w}–{row.l}
                        </span>
                        <span className="text-xs text-faint tabular-nums">
                          {games ? Math.round((row.w / games) * 100) : 0}%
                        </span>
                      </span>
                    </li>
                  );
                })}
            </ul>
          </section>
        ) : null}

        <section>
          <h2 className="text-xl text-fg">Recent</h2>
          {matches.length === 0 ? (
            <MascotLine>No games yet. Log one after the round, while the note is still true.</MascotLine>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {matches.slice(0, 20).map((match) => {
                const legend = LEGENDS.find((card) => card.id === match.oppLegendId);
                const mine = decks.find((deck) => deck.id === match.deckId);
                return (
                  <li key={match.id} className="rounded-card border border-border bg-surface px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-fg">
                          <span className={match.result === "W" ? "text-ok" : "text-danger"}>{match.result}</span>
                          {" vs "}
                          {legend?.champion ?? "Unknown"}
                        </p>
                        <p className="mt-1 text-xs text-faint">
                          {new Date(match.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          {mine ? ` · ${mine.name}` : ""}
                        </p>
                        {match.note ? <p className="mt-2 text-sm text-muted">{match.note}</p> : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMatch(match.id)}
                        className="text-sm font-semibold text-faint"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </Shell>
  );
}
