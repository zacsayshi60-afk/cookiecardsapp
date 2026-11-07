import { createFileRoute, Link } from "@tanstack/react-router";
import { DOMAIN_BLURB, DOMAINS, KEYWORD_GLOSSARY } from "@/data/catalog";
import { DomainDots, Shell } from "@/components/shell";

export const Route = createFileRoute("/rules")({ component: RulesPage });

const SECTIONS = [
  {
    title: "How you win",
    body: "First to 8 points in a 1v1. You score by conquering a battlefield or by holding one at the start of your turn. A conquer can only give the last point if you scored every battlefield that turn.",
  },
  {
    title: "What you bring",
    body: "A legend, a chosen champion inside a 40-card main deck, a 12-card rune deck in the legend's domains, and 3 battlefields. Max 3 copies of a name. Signature cards of your champion, 3 total. Side deck up to 10 in a match.",
  },
  {
    title: "A turn, short",
    body: "Channel 2 runes. Draw. Exhaust a rune for Energy, recycle one for Power of its domain. Play units to your base or a battlefield you control, spells, and gear. Move units, fight with Might, then pass.",
  },
  {
    title: "Identity",
    body: "The legend's domains are the only ones in the main deck and the rune deck. A card with two domains needs both of them on the legend.",
  },
];

function RulesPage() {
  return (
    <Shell>
      <div className="flex flex-col gap-4 px-4 pt-6 pb-8">
        <header>
          <Link to="/" className="text-sm font-semibold text-primary">
            Desk
          </Link>
          <h1 className="mt-2 font-display text-4xl text-fg">Crib</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            A pocket version of constructed Riftbound. The numbered rulebook on Riot's rules hub is the one that
            settles arguments.
          </p>
        </header>
        {SECTIONS.map((section) => (
          <section key={section.title} className="rounded-card border border-border bg-surface px-4 py-4">
            <h2 className="text-xl text-fg">{section.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{section.body}</p>
          </section>
        ))}
        <section>
          <h2 className="text-xl text-fg">Domains</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {DOMAINS.map((domain) => (
              <li key={domain} className="rounded-card border border-border bg-surface px-4 py-3">
                <p className="flex items-center gap-2 font-semibold text-fg">
                  <DomainDots domains={[domain]} />
                  {domain}
                </p>
                <p className="mt-1 text-sm text-muted">{DOMAIN_BLURB[domain]}</p>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-xl text-fg">Keywords</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {KEYWORD_GLOSSARY.map((entry) => (
              <li key={entry.name} className="rounded-card border border-border bg-surface px-4 py-3">
                <p className="font-semibold text-fg">{entry.name}</p>
                <p className="mt-1 text-sm text-muted">{entry.text}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-card border border-border bg-surface px-4 py-4">
          <h2 className="text-xl text-fg">Worth adding next</h2>
          <ul className="mt-2 flex list-disc flex-col gap-2 pl-5 text-sm text-muted">
            <li>The full printed pool, with real oracle text, once a card file is licensed or hand-entered.</li>
            <li>Prices and a want list against what you already marked owned.</li>
            <li>A best-of-three mode that bans the battlefields you already used.</li>
            <li>Accounts, so a list on the phone is the same list at the laptop.</li>
            <li>The same desk for Flesh and Blood or Magic, after Riftbound feels finished.</li>
          </ul>
        </section>
      </div>
    </Shell>
  );
}
