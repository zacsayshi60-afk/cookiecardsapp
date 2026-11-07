import { Link, useRouterState } from "@tanstack/react-router";
import { Compass, Layers, Library, Menu, NotebookPen, Trophy } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { DOMAINS, type Card, type Domain } from "@/data/catalog";
import { cn } from "@/lib/cn";
import { useDeskReady } from "@/lib/store";

const NAV = [
  { to: "/rift", label: "Desk", icon: Compass, exact: true },
  { to: "/cards", label: "Cards", icon: Library, exact: false },
  { to: "/meta", label: "Meta", icon: Trophy, exact: false },
  { to: "/build", label: "Build", icon: Layers, exact: false },
  { to: "/log", label: "Log", icon: NotebookPen, exact: false },
] as const;

export function Shell({
  children,
  bar = false,
}: {
  children: ReactNode;
  bar?: boolean;
}) {
  useDeskReady();
  const path = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className={cn("mx-auto min-h-dvh max-w-3xl overflow-x-hidden", bar ? "page-pad-bar" : "page-pad")}>
      <div className="sticky top-0 z-40 flex h-12 items-center justify-end bg-bg px-2">
        <AppMenu />
      </div>
      {children}
      <nav className="dock" aria-label="Primary">
        <ul className="mx-auto grid h-full max-w-3xl grid-cols-5">
          {NAV.map((item) => {
            const active = item.exact ? path === item.to : path === item.to || path.startsWith(`${item.to}/`);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex h-full flex-col items-center justify-center gap-1 text-xs font-medium",
                    active ? "text-primary" : "text-faint",
                  )}
                >
                  <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

const SECTIONS = [
  { to: "/rift", label: "Riftbook" },
  { to: "/magic", label: "Magisterium" },
  { to: "/fab", label: "Rathe Archive" },
  { to: "/", label: "CardBook" },
] as const;

export function AppMenu() {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    setOpen(false);
  }, [path]);

  return (
    <>
      <button
        type="button"
        className="grid size-11 place-items-center text-primary"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Menu className="size-6" strokeWidth={1.75} aria-hidden />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50" onClick={() => setOpen(false)}>
          <nav
            aria-label="Card Book"
            className="absolute top-12 right-3 w-56 rounded-2xl border border-[#2f5a1c] bg-black p-2"
            onClick={(event) => event.stopPropagation()}
          >
            {SECTIONS.map((item) => {
              const active = item.to === "/" ? path === "/" : path === item.to || path.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={cn(
                    "flex h-11 items-center rounded-xl px-3 text-base font-semibold",
                    active ? "bg-[#c6ff3a] text-black" : "text-[#c6ff3a]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </>
  );
}

const DOMAIN_BG: Record<Domain, string> = {
  Fury: "bg-fury",
  Calm: "bg-calm",
  Mind: "bg-mind",
  Body: "bg-body",
  Chaos: "bg-chaos",
  Order: "bg-order",
};

export function domainBg(domain: Domain): string {
  return DOMAIN_BG[domain];
}

export function DomainDots({ domains, size = "md" }: { domains: Domain[]; size?: "sm" | "md" }) {
  const box = size === "sm" ? "size-2.5" : "size-3";
  if (domains.length === 0) {
    return <span className={cn(box, "rounded-full bg-primary")} aria-hidden />;
  }
  return (
    <span className="inline-flex items-center gap-1" aria-label={domains.join(" and ")}>
      {domains.map((domain) => (
        <span key={domain} className={cn(box, "rounded-full", DOMAIN_BG[domain])} title={domain} />
      ))}
    </span>
  );
}

export function DomainStripe({ domains }: { domains: Domain[] }) {
  const shown = domains.length ? domains : DOMAINS;
  return (
    <span className="flex h-1.5 overflow-hidden rounded-full" aria-hidden>
      {shown.map((domain) => (
        <span key={domain} className={cn("h-full flex-1", DOMAIN_BG[domain])} />
      ))}
    </span>
  );
}

export function Mascot({ size = "md", label = "" }: { size?: "sm" | "md" | "lg"; label?: string }) {
  const box = size === "sm" ? "size-10" : size === "lg" ? "size-20" : "size-14";
  return (
    <img
      src="/mascot.jpg"
      alt={label}
      className={cn("shrink-0 rounded-full border border-border bg-surface object-cover object-center", box)}
    />
  );
}

export function MascotLine({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-sm leading-relaxed text-muted">
      <Mascot size="sm" />
      <span>{children}</span>
    </p>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-card border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-muted">
      {children}
    </p>
  );
}

export function CardThumb({ image }: { image?: string }) {
  if (!image) {
    return <span className="h-14 w-10 shrink-0 rounded-md bg-bg-deep" aria-hidden />;
  }
  return (
    <img
      src={image}
      alt=""
      referrerPolicy="no-referrer"
      className="h-14 w-10 shrink-0 rounded-md bg-bg-deep object-cover"
    />
  );
}

export function DeckLine({
  image,
  count,
  name,
  line,
}: {
  image?: string;
  count: number;
  name: string;
  line?: string;
}) {
  return (
    <span className="flex items-center gap-3 rounded-xl px-1 py-1.5">
      <CardThumb image={image} />
      <span className="min-w-0 flex-1">
        <span className="block">
          <span className="mr-2 tabular-nums text-primary">{count}</span>
          {name}
        </span>
        {line ? <span className="block text-xs text-faint">{line}</span> : null}
      </span>
    </span>
  );
}

export function cardLine(card: Card): string {
  if (card.kind === "Legend") return "Legend";
  if (card.kind === "Rune") return "Rune";
  if (card.kind === "Battlefield") return "Battlefield";
  const might = card.might != null ? ` · Might ${card.might}` : "";
  return `${card.kind} · ${card.energy}${might}`;
}

export function Stepper({
  value,
  onChange,
  max = 3,
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  max?: number;
  label: string;
}) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-bg">
      <button
        type="button"
        className="flex size-11 items-center justify-center text-fg disabled:text-faint"
        aria-label={`Remove one ${label}`}
        disabled={value <= 0}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <span className="w-5 text-center text-sm font-semibold tabular-nums text-fg">{value}</span>
      <button
        type="button"
        className="flex size-11 items-center justify-center text-fg disabled:text-faint"
        aria-label={`Add one ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </span>
  );
}
