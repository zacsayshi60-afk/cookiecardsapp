import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { GALLERY, GALLERY_SETS, type GalleryCard } from "@/data/gallery";
import { type Domain } from "@/data/catalog";
import { useRift } from "@/lib/store";
import { DomainDots, MascotLine, Shell, Stepper } from "@/components/shell";

export const Route = createFileRoute("/cards/")({ component: Library });

const RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Alt art", "Overnumbered", "Signed", "Standard"];
const DOMAINS: Domain[] = ["Fury", "Calm", "Mind", "Body", "Chaos", "Order"];
const KINDS = ["Legend", "Champion", "Unit", "Spell", "Gear", "Battlefield", "Rune"];
const TOKEN_FAMILIES = [
  "Bomb",
  "Gold",
  "Buff",
  "Recruit",
  "Mech",
  "Bird",
  "Sprite",
  "Brush",
  "Reflection",
  "Shadow Clone",
  "Tentacle",
  "Sand Soldier",
  "Empowered",
  "XP Tracker",
  "Baron Pit",
];
const PRINTS = ["Standard", "Showcase", "Signature", "Promo", "Foil"];

function Library() {
  const [query, setQuery] = useState("");
  const [setId, setSetId] = useState("all");
  const [rarity, setRarity] = useState("All");
  const [domain, setDomain] = useState<Domain | "All" | "Colorless">("All");
  const [kind, setKind] = useState("All");
  const [token, setToken] = useState("All");
  const [print, setPrint] = useState("All");
  const [limit, setLimit] = useState(48);
  const owned = useRift((state) => state.owned);
  const setOwned = useRift((state) => state.setOwned);
  const mainSets = GALLERY_SETS.filter((set) => set.category === "main");
  const filtering =
    query.trim() !== "" ||
    setId !== "all" ||
    rarity !== "All" ||
    domain !== "All" ||
    kind !== "All" ||
    token !== "All" ||
    print !== "All";

  useEffect(() => {
    setLimit(48);
  }, [query, setId, rarity, domain, kind, token, print]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GALLERY.filter((card) => {
      if (setId === "extras" && cardSetCategory(card.setId) === "main") return false;
      if (setId !== "all" && setId !== "extras" && card.setId !== setId) return false;
      if (rarity !== "All" && card.rarity !== rarity) return false;
      if (domain === "Colorless" && !isColorless(card)) return false;
      if (domain !== "All" && domain !== "Colorless" && !card.domains.includes(domain)) return false;
      if (kind === "Champion" && !card.champion) return false;
      if (kind !== "All" && kind !== "Champion" && card.kind !== kind) return false;
      if (token === "Tokens" && card.kind !== "Token") return false;
      if (token !== "All" && token !== "Tokens" && (card.kind !== "Token" || tokenFamily(card.name) !== token)) {
        return false;
      }
      if (print !== "All" && printGroup(card) !== print) return false;
      if (!q) return true;
      return (
        card.name.toLowerCase().includes(q) ||
        card.code.toLowerCase().includes(q) ||
        card.set.toLowerCase().includes(q) ||
        card.kind.toLowerCase().includes(q) ||
        card.variation.toLowerCase().includes(q) ||
        card.domains.some((item) => item.toLowerCase().includes(q))
      );
    });
  }, [query, setId, rarity, domain, kind, token, print]);

  const visible = rows.slice(0, limit);

  return (
    <Shell>
      <header className="px-4 pt-6">
        <h1 className="font-display text-4xl text-fg">Library</h1>
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <p className="text-sm text-muted">{rows.length} printed cards. Picture first, then the name.</p>
          {filtering ? (
            <button
              type="button"
              className="h-11 shrink-0 text-sm font-semibold text-primary"
              onClick={() => {
                setQuery("");
                setSetId("all");
                setRarity("All");
                setDomain("All");
                setKind("All");
                setToken("All");
                setPrint("All");
              }}
            >
              Clear
            </button>
          ) : null}
        </div>
      </header>
      <div className="mt-4 flex flex-col gap-3 px-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name or number"
          className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-base text-fg placeholder:text-faint"
          aria-label="Search cards"
        />
        <FilterRow label="Domain" wrap>
          <Chip on={domain === "All"} onClick={() => setDomain("All")}>
            Any domain
          </Chip>
          {DOMAINS.map((item) => (
            <Chip key={item} on={domain === item} onClick={() => setDomain(item)}>
              <DomainDots domains={[item]} size="sm" />
              {item}
            </Chip>
          ))}
          <Chip on={domain === "Colorless"} onClick={() => setDomain("Colorless")}>
            Colorless
          </Chip>
        </FilterRow>
        <FilterRow label="Type">
          <Chip on={kind === "All"} onClick={() => setKind("All")}>
            Any type
          </Chip>
          {KINDS.map((item) => (
            <Chip key={item} on={kind === item} onClick={() => setKind(item)}>
              {item}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="Tokens">
          <Chip on={token === "All"} onClick={() => setToken("All")}>
            Any card
          </Chip>
          <Chip on={token === "Tokens"} onClick={() => setToken("Tokens")}>
            All tokens
          </Chip>
          {TOKEN_FAMILIES.map((item) => (
            <Chip key={item} on={token === item} onClick={() => setToken(item)}>
              {item}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="Set">
          <Chip on={setId === "all"} onClick={() => setSetId("all")}>
            All sets
          </Chip>
          {mainSets.map((set) => (
            <Chip key={set.id} on={setId === set.id} onClick={() => setSetId(set.id)}>
              {set.name}
            </Chip>
          ))}
          <Chip on={setId === "extras"} onClick={() => setSetId("extras")}>
            Promos
          </Chip>
        </FilterRow>
        <FilterRow label="Rarity">
          <Chip on={rarity === "All"} onClick={() => setRarity("All")}>
            Any rarity
          </Chip>
          {RARITIES.map((item) => (
            <Chip key={item} on={rarity === item} onClick={() => setRarity(item)}>
              {item}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="Printing">
          <Chip on={print === "All"} onClick={() => setPrint("All")}>
            Any print
          </Chip>
          {PRINTS.map((item) => (
            <Chip key={item} on={print === item} onClick={() => setPrint(item)}>
              {item}
            </Chip>
          ))}
        </FilterRow>
        {rows.length === 0 ? (
          <MascotLine>Nothing under that filter.</MascotLine>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {visible.map((card) => (
                <li key={card.id} className="card-tile flex flex-col">
                  <Link to="/cards/$cardId" params={{ cardId: card.id }} className="block min-w-0">
                    <CardFace card={card} />
                    <span className="mt-2 flex items-center gap-1.5">
                      <DomainDots domains={playDomains(card)} size="sm" />
                      <span className="min-w-0 truncate text-sm font-semibold leading-snug text-fg">{card.name}</span>
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted">
                      {card.kind || "Card"}
                      {card.energy != null ? ` · ${card.energy}` : ""}
                      {` · ${card.set}`}
                      {card.rarity ? ` · ${card.rarity}` : ""}
                      {card.variation ? ` · ${card.variation}` : ""}
                      {card.banned ? " · Banned" : ""}
                    </span>
                  </Link>
                  <div className="mt-2">
                    <Stepper
                      value={owned[card.id] ?? 0}
                      label={card.name}
                      onChange={(next) => setOwned(card.id, next)}
                    />
                  </div>
                </li>
              ))}
            </ul>
            {visible.length < rows.length ? (
              <button
                type="button"
                className="mb-6 h-11 rounded-xl border border-border bg-surface text-sm font-semibold text-fg"
                onClick={() => setLimit((count) => count + 48)}
              >
                Show more ({rows.length - visible.length} left)
              </button>
            ) : (
              <p className="pb-6 text-center text-xs text-faint">Art from the current public card list.</p>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}

function cardSetCategory(setId: string): string {
  return GALLERY_SETS.find((set) => set.id === setId)?.category ?? "other";
}

function playDomains(card: GalleryCard): Domain[] {
  return card.domains.filter((item): item is Domain => DOMAINS.includes(item as Domain));
}

function isColorless(card: GalleryCard): boolean {
  return card.name.startsWith("Neeko");
}

function tokenFamily(name: string): string {
  if (name.startsWith("Recruit")) return "Recruit";
  return name;
}

function printGroup(card: GalleryCard): string {
  const label = card.variation.toLowerCase();
  if (!label) return "Standard";
  if (label.startsWith("promo")) return "Promo";
  if (label.startsWith("showcase")) return "Showcase";
  if (label.startsWith("signature")) return "Signature";
  if (label === "foil") return "Foil";
  return "Other";
}

function FilterRow({ label, children, wrap = false }: { label: string; children: ReactNode; wrap?: boolean }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold tracking-widest text-faint uppercase">{label}</p>
      <div className={wrap ? "flex flex-wrap gap-2" : "no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4"}>{children}</div>
    </div>
  );
}

function CardFace({ card }: { card: GalleryCard }) {
  const [failed, setFailed] = useState(false);
  if (!card.image || failed) {
    return (
      <span className="card-art flex items-end overflow-hidden rounded-card border border-border bg-bg-deep p-3">
        <span className="text-sm font-semibold leading-snug text-fg">{card.code}</span>
      </span>
    );
  }
  return (
    <span className="block overflow-hidden rounded-card border border-border bg-bg-deep">
      <img
        src={card.image}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="card-art w-full object-cover"
      />
    </span>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        on
          ? "inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-3 text-sm font-semibold text-primary-fg"
          : "inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm font-medium text-fg"
      }
    >
      {children}
    </button>
  );
}
