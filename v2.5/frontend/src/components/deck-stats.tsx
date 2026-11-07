import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CARD_BY_ID, type Domain } from "@/data/catalog";
import { openingHand, type Analysis } from "@/lib/deck-math";
import { DomainDots } from "@/components/shell";

export function DeckStats({
  analysis,
  main,
}: {
  analysis: Analysis;
  main: Record<string, number>;
}) {
  const [mounted, setMounted] = useState(false);
  const [hand, setHand] = useState<string[]>([]);
  useEffect(() => setMounted(true), []);

  const maxType = Math.max(1, ...analysis.types.map((row) => row.count));

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-3 gap-2">
        <Stat label="Avg energy" value={analysis.avgEnergy.toFixed(1)} />
        <Stat label="Avg might" value={analysis.unitCount ? analysis.avgMight.toFixed(1) : "—"} />
        <Stat label="Cost ≤ 2" value={String(analysis.early)} />
      </dl>

      <section className="rounded-card border border-border bg-surface p-4">
        <h3 className="text-lg text-fg">Energy curve</h3>
        <p className="mt-1 text-sm text-muted">Every main-deck card, champions included.</p>
        <div className="mt-3 h-44">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analysis.curve} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="cost"
                  tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  width={28}
                  allowDecimals={false}
                  tick={{ fill: "var(--color-faint)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-surface-2)" }}
                  contentStyle={{
                    background: "var(--color-bg-deep)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    color: "var(--color-fg)",
                  }}
                />
                <Bar dataKey="count" name="Cards" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </section>

      <section className="rounded-card border border-border bg-surface p-4">
        <h3 className="text-lg text-fg">Types</h3>
        <ul className="mt-3 flex flex-col gap-3">
          {analysis.types.map((row) => (
            <li key={row.name}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-fg">{row.name}</span>
                <span className="tabular-nums text-muted">{row.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-bg">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(row.count / maxType) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-card border border-border bg-surface p-4">
        <h3 className="text-lg text-fg">Power pips</h3>
        <p className="mt-1 text-sm text-muted">What the main deck actually asks you to recycle.</p>
        <ul className="mt-3 flex flex-col gap-2">
          {analysis.pips.map((row) => (
            <li key={row.domain} className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2 text-fg">
                <DomainDots domains={[row.domain]} />
                {row.domain}
              </span>
              <span className="tabular-nums text-muted">
                {row.pips} pips · suggest {analysis.suggested[row.domain as Domain] ?? 0}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {analysis.keywords.length > 0 ? (
        <section className="rounded-card border border-border bg-surface p-4">
          <h3 className="text-lg text-fg">Keywords</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {analysis.keywords.map((row) => (
              <li
                key={row.name}
                className="rounded-full border border-border bg-bg px-3 py-1 text-sm text-fg"
              >
                {row.name}
                <span className="ml-2 tabular-nums text-muted">{row.count}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-card border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg text-fg">Test hand</h3>
          <button
            type="button"
            className="inline-flex h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg"
            onClick={() => setHand(openingHand(main, 5))}
          >
            Draw 5
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">A practice shuffle. Not the full mulligan rules.</p>
        {hand.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
            {hand.map((id, index) => {
              const card = CARD_BY_ID[id];
              return (
                <li key={`${id}-${index}`} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-fg">{card?.name ?? id}</span>
                  <span className="shrink-0 tabular-nums text-muted">{card?.energy ?? "—"}</span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-surface px-3 py-3">
      <dt className="text-xs text-faint">{label}</dt>
      <dd className="mt-1 font-display text-2xl text-fg tabular-nums">{value}</dd>
    </div>
  );
}

export function IssueList({ analysis }: { analysis: Analysis }) {
  if (analysis.issues.length === 0) {
    return (
      <p className="rounded-card border border-border bg-surface px-4 py-3 text-sm text-ok">
        Legal for this practice table. 40, 12, three fields, identity, copy cap.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {analysis.issues.map((issue) => (
        <li
          key={issue.text}
          className={
            issue.tone === "bad"
              ? "rounded-xl border border-border bg-surface px-3 py-2 text-sm text-danger"
              : "rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary"
          }
        >
          {issue.text}
        </li>
      ))}
    </ul>
  );
}
