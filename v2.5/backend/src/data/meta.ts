import { DOMAINS, type Domain } from "@/data/catalog";
import { analyze, emptyRunes, type DeckLike } from "@/lib/deck-math";

export type MetaDeck = DeckLike & {
  id: string;
  name: string;
  tagline: string;
  pilot: string;
  share: number;
  win: number;
  matches: number;
  tier: "S" | "A" | "B";
};

function runes(partial: Partial<Record<Domain, number>>): Record<Domain, number> {
  return { ...emptyRunes(), ...partial };
}

export const META: MetaDeck[] = [
  {
    id: "rocket-curve",
    name: "Rocket Curve",
    legendId: "OGN-251",
    chosenId: "OGN-030",
    tagline: "Empty the hand, take the field, reload off the rocket.",
    pilot: "Jinx, Demolitionist is the chosen champion. Jinx, Rebel is the other champion. Super Mega Death Rocket!, Jinx is the signature. the rest is printed cards in these two domains.",
    share: 18,
    win: 54,
    matches: 320,
    tier: "S",
    main: {"OGN-030":3,"OGN-202":2,"OGN-252":2,"RAD-001":3,"RAD-107":3,"SFD-013":3,"OGN-003":3,"VEN-009":3,"UNL-121":3,"SFD-121":3,"OGN-165":3,"OGN-204":2,"OGN-040":2,"OGN-179":2,"SFD-133":2,"RAD-004":1},
    side: {"SFD-133":1,"RAD-004":1,"RAD-102":1,"SFD-139":1,"RAD-047":1,"OGN-201":1,"OGN-017":1,"SFD-150":1},
    runes: runes({"Fury":7,"Chaos":5}),
    battlefields: ["OGN-290","VEN-166","UNL-219"],
  },
  {
    id: "herald-grid",
    name: "Herald Grid",
    legendId: "OGN-265",
    chosenId: "OGN-117",
    tagline: "Recruits, gear, and a spell you always have a body for.",
    pilot: "Viktor, Innovator is the chosen champion. Viktor, Leader is the other champion. Siphon Power, Viktor is the signature. the rest is printed cards in these two domains.",
    share: 14,
    win: 53,
    matches: 260,
    tier: "S",
    main: {"OGN-117":3,"OGN-246":2,"OGN-266":2,"OGN-097":3,"UNL-153":3,"OGN-210":3,"VEN-117":3,"VEN-047":3,"SFD-061":3,"RAD-130":3,"UNL-152":3,"OGN-120":2,"OGN-245":2,"SFD-080":2,"OGN-206":2,"OGN-242":1},
    side: {"OGN-206":1,"OGN-242":1,"SFD-178":1,"OGN-207":1,"UNL-072":1,"VEN-116":1,"UNL-063":1,"OGN-098":1},
    runes: runes({"Mind":9,"Order":3}),
    battlefields: ["SFD-218","OGN-292","SFD-220"],
  },
  {
    id: "charm-hold",
    name: "Charm Hold",
    legendId: "OGN-255",
    chosenId: "OGN-119",
    tagline: "Make their attack smaller, then keep the point.",
    pilot: "Ahri, Inquisitive is the chosen champion. Ahri, Confident is the other champion. Fox-Fire, Ahri is the signature. the rest is printed cards in these two domains.",
    share: 12,
    win: 52,
    matches: 210,
    tier: "A",
    main: {"OGN-119":3,"RAD-038":2,"OGN-256":2,"VEN-043":3,"SFD-041":3,"OGN-097":3,"OGN-044":3,"VEN-024":3,"UNL-041":3,"VEN-047":3,"SFD-061":3,"OGN-081":2,"OGN-120":2,"SFD-080":2,"UNL-042":2,"UNL-072":1},
    side: {"UNL-042":1,"UNL-072":1,"UNL-063":1,"OGN-098":1,"RAD-047":1,"OGN-047":1,"SFD-052":1,"SFD-083":1},
    runes: runes({"Calm":3,"Mind":9}),
    battlefields: ["VEN-159","OGN-283","SFD-214"],
  },
  {
    id: "chronobreak",
    name: "Chronobreak",
    legendId: "RAD-139",
    chosenId: "RAD-061",
    tagline: "A cheaper unit now, and you do not mind if it dies.",
    pilot: "Ekko, Ingenious is the chosen champion. Ekko, Revolutionary is the other champion. Chronobreak is the signature. the rest is printed cards in these two domains.",
    share: 11,
    win: 51,
    matches: 180,
    tier: "A",
    main: {"RAD-061":3,"RAD-021":2,"RAD-140":2,"SFD-013":3,"OGN-097":3,"OGN-003":3,"RAD-026":3,"VEN-047":3,"SFD-061":3,"VEN-009":3,"SFD-062":3,"OGN-120":2,"OGN-040":2,"RAD-002":2,"UNL-072":2,"RAD-102":1},
    side: {"UNL-072":1,"RAD-102":1,"UNL-063":1,"OGN-098":1,"RAD-047":1,"SFD-083":1,"RAD-048":1,"RAD-056":1},
    runes: runes({"Fury":6,"Mind":6}),
    battlefields: ["OGN-289","OGN-293","OGN-294"],
  },
  {
    id: "ready-exile",
    name: "Ready Exile",
    legendId: "RAD-149",
    chosenId: "VEN-041",
    tagline: "Play onto the battlefield and swing the same turn.",
    pilot: "Riven, Shattered is the chosen champion. Riven, Broken Blade is the other champion. Blade of the Exile is the signature. the rest is printed cards in these two domains.",
    share: 9,
    win: 51,
    matches: 150,
    tier: "A",
    main: {"VEN-041":3,"RAD-043":2,"RAD-150":2,"VEN-043":3,"UNL-131":3,"SFD-041":3,"RAD-107":3,"VEN-024":3,"UNL-041":3,"UNL-121":3,"SFD-121":3,"OGN-204":2,"OGN-081":2,"OGN-179":2,"UNL-042":2,"SFD-133":1},
    side: {"UNL-042":1,"SFD-133":1,"RAD-004":1,"SFD-139":1,"RAD-047":1,"OGN-047":1,"SFD-052":1,"OGN-201":1},
    runes: runes({"Calm":9,"Chaos":3}),
    battlefields: ["UNL-207","UNL-208","RAD-161"],
  },
  {
    id: "standard",
    name: "Standard",
    legendId: "RAD-155",
    chosenId: "RAD-091",
    tagline: "Deploy the standard, then walk a body onto it.",
    pilot: "Jarvan IV, Martial Paragon is the chosen champion. Jarvan IV, Royal Heir is the other champion. Demacian Standard is the signature. the rest is printed cards in these two domains.",
    share: 8,
    win: 49,
    matches: 140,
    tier: "B",
    main: {"RAD-091":3,"RAD-133":2,"RAD-156":2,"UNL-111":3,"UNL-153":3,"OGN-139":3,"OGN-210":3,"RAD-130":3,"OGN-230":3,"UNL-152":3,"VEN-070":3,"OGN-163":2,"OGN-245":2,"UNL-109":2,"OGN-124":2,"OGN-206":1},
    side: {"OGN-124":1,"OGN-206":1,"OGN-242":1,"SFD-178":1,"SFD-118":1,"RAD-124":1,"UNL-101":1,"OGN-207":1},
    runes: runes({"Body":9,"Order":3}),
    battlefields: ["OGN-284","VEN-162","UNL-214"],
  },
];

for (const deck of META) {
  const report = analyze(deck);
  if (!report.legal) {
    throw new Error(`${deck.name}: ${report.issues.filter((issue) => issue.tone === "bad").map((issue) => issue.text).join(" ")}`);
  }
  for (const domain of DOMAINS) {
    if (deck.runes[domain] == null) deck.runes[domain] = 0;
  }
}

export function metaById(id: string): MetaDeck | undefined {
  return META.find((deck) => deck.id === id);
}
