import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Layers, Library } from "lucide-react";
import { AppMenu } from "@/components/shell";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/magic")({
  component: MagicShell,
});

const FOOTER = [
  { to: "/magic/decks", label: "Decks", icon: Layers },
  { to: "/magic/cards", label: "Library", icon: Library },
] as const;

function MagicShell() {
  const path = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="page-pad mx-auto min-h-dvh max-w-3xl overflow-x-hidden bg-[#10110f] text-[#f4f1e8]">
      <div className="sticky top-0 z-40 flex h-12 items-center justify-end bg-[#10110f] px-2">
        <AppMenu />
      </div>
      <Outlet />
      <nav className="dock" aria-label="Magisterium">
        <ul className="mx-auto grid h-full max-w-3xl grid-cols-2">
          {FOOTER.map((item) => {
            const active = path === item.to || path.startsWith(`${item.to}/`);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex h-full flex-col items-center justify-center gap-1 text-xs font-medium",
                    active ? "text-[#c6ff3a]" : "text-[#8d887c]",
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
