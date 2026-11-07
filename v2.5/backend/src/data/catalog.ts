export type Domain = "Fury" | "Calm" | "Mind" | "Body" | "Chaos" | "Order";

export const DOMAINS: Domain[] = ["Fury", "Calm", "Mind", "Body", "Chaos", "Order"];

export type CardKind =
  | "Legend"
  | "Champion"
  | "Unit"
  | "Spell"
  | "Gear"
  | "Battlefield"
  | "Rune";

export type CardSet = string;

/** gallery = public writeup. summary = shortened public writeup. practice = original stand-in. */
export type CardSource = "gallery" | "summary" | "practice";

export type Card = {
  id: string;
  name: string;
  kind: CardKind;
  domains: Domain[];
  energy: number;
  power: Partial<Record<Domain, number>>;
  might?: number;
  text: string;
  keywords: string[];
  set: CardSet;
  source: CardSource;
  image?: string;
  champion?: string;
  signatureFor?: string;
};

export const DOMAIN_BLURB: Record<Domain, string> = {
  Fury: "Pressure, damage, and a reward for taking battlefields.",
  Calm: "Positioning, Deflect, and holding what you already have.",
  Mind: "Draw, shrink, and gear. The slow plan.",
  Body: "High Might and combat that does not fold.",
  Chaos: "Discard, the trash, and combat tricks.",
  Order: "Wide boards, Recruits, and steady value.",
};

type PracticeSpec = {
  slug: string;
  name: string;
  kind: "Unit" | "Spell" | "Gear";
  energy: number;
  might?: number;
  power?: number;
  keywords: string[];
  text: string;
};

const PRACTICE: Record<Domain, PracticeSpec[]> = {
  Fury: [
    {
      slug: "cinder-scout",
      name: "Cinder Scout",
      kind: "Unit",
      energy: 1,
      might: 2,
      keywords: ["Accelerate"],
      text: "Accelerate — you may pay 1 extra Energy to have me enter ready.",
    },
    {
      slug: "brand-runner",
      name: "Brand Runner",
      kind: "Unit",
      energy: 2,
      might: 3,
      keywords: ["Assault"],
      text: "Assault 1. (+1 Might while I am attacking.)",
    },
    {
      slug: "gatebreakers",
      name: "Gatebreakers",
      kind: "Unit",
      energy: 3,
      might: 4,
      keywords: [],
      text: "When you conquer a battlefield, ready me.",
    },
    {
      slug: "siege-brand",
      name: "Siege Brand",
      kind: "Unit",
      energy: 4,
      might: 5,
      keywords: ["Assault"],
      text: "Assault 2.",
    },
    {
      slug: "rally-pyre",
      name: "Rally Pyre",
      kind: "Spell",
      energy: 1,
      keywords: [],
      text: "Deal 2 damage to a unit at a battlefield.",
    },
    {
      slug: "open-ground",
      name: "Open Ground",
      kind: "Spell",
      energy: 2,
      keywords: ["Reaction"],
      text: "Reaction: a unit gets +2 Might this turn.",
    },
    {
      slug: "conquest-drum",
      name: "Conquest Drum",
      kind: "Gear",
      energy: 3,
      keywords: [],
      text: "Whenever you conquer, draw 1, then discard 1.",
    },
  ],
  Calm: [
    {
      slug: "reed-sentinel",
      name: "Reed Sentinel",
      kind: "Unit",
      energy: 1,
      might: 2,
      keywords: ["Deflect"],
      text: "Deflect 1. (Opponents pay 1 extra Power to choose me.)",
    },
    {
      slug: "harbor-guard",
      name: "Harbor Guard",
      kind: "Unit",
      energy: 2,
      might: 3,
      keywords: [],
      text: "When I enter a battlefield you control, ready another unit there.",
    },
    {
      slug: "tide-anchor",
      name: "Tide Anchor",
      kind: "Unit",
      energy: 3,
      might: 4,
      keywords: [],
      text: "Enemy units enter battlefields I am at exhausted.",
    },
    {
      slug: "quiet-bastion",
      name: "Quiet Bastion",
      kind: "Unit",
      energy: 4,
      might: 6,
      keywords: ["Deflect"],
      text: "Deflect 1.",
    },
    {
      slug: "mist-veil",
      name: "Mist Veil",
      kind: "Spell",
      energy: 1,
      keywords: ["Reaction"],
      text: "Reaction: a unit gains Deflect 2 this turn.",
    },
    {
      slug: "hold-the-line",
      name: "Hold the Line",
      kind: "Spell",
      energy: 2,
      keywords: [],
      text: "Ready up to two units you control at one battlefield.",
    },
    {
      slug: "watch-glass",
      name: "Watch Glass",
      kind: "Gear",
      energy: 2,
      keywords: [],
      text: "At the start of your turn, if you hold a battlefield, draw 1.",
    },
  ],
  Mind: [
    {
      slug: "ink-adept",
      name: "Ink Adept",
      kind: "Unit",
      energy: 1,
      might: 1,
      keywords: [],
      text: "When I enter, draw 1.",
    },
    {
      slug: "glass-thinker",
      name: "Glass Thinker",
      kind: "Unit",
      energy: 2,
      might: 2,
      keywords: ["Hidden"],
      text: "Hidden — you may play me face down. Turn me face up by paying my cost.",
    },
    {
      slug: "gear-smith",
      name: "Gear Smith",
      kind: "Unit",
      energy: 3,
      might: 3,
      keywords: [],
      text: "When I enter, the next Gear you play this turn costs 1 less Energy.",
    },
    {
      slug: "archivist",
      name: "Archivist",
      kind: "Unit",
      energy: 4,
      might: 4,
      keywords: [],
      text: "When I enter, draw 2, then discard 1.",
    },
    {
      slug: "pare-down",
      name: "Pare Down",
      kind: "Spell",
      energy: 1,
      keywords: [],
      text: "A unit gets −2 Might this turn, to a minimum of 1.",
    },
    {
      slug: "calculated",
      name: "Calculated",
      kind: "Spell",
      energy: 2,
      keywords: ["Reaction"],
      text: "Reaction: counter a spell unless its controller recycles a rune.",
    },
    {
      slug: "lens-array",
      name: "Lens Array",
      kind: "Gear",
      energy: 3,
      keywords: [],
      text: "Exhaust: draw 1, then put a card from your hand on top of your deck.",
    },
  ],
  Body: [
    {
      slug: "oak-brawler",
      name: "Oak Brawler",
      kind: "Unit",
      energy: 1,
      might: 3,
      keywords: [],
      text: "A heavy one-drop. No other text.",
    },
    {
      slug: "marrow-guard",
      name: "Marrow Guard",
      kind: "Unit",
      energy: 2,
      might: 4,
      keywords: [],
      text: "I take 1 less combat damage.",
    },
    {
      slug: "ridge-colossus",
      name: "Ridge Colossus",
      kind: "Unit",
      energy: 3,
      might: 5,
      keywords: ["Assault"],
      text: "Assault 1.",
    },
    {
      slug: "worldroot",
      name: "Worldroot",
      kind: "Unit",
      energy: 5,
      might: 8,
      power: 2,
      keywords: ["Stun"],
      text: "When I enter, stun an enemy unit at my battlefield.",
    },
    {
      slug: "blood-price",
      name: "Blood Price",
      kind: "Spell",
      energy: 1,
      keywords: [],
      text: "Deal 1 damage to a unit. Draw 1.",
    },
    {
      slug: "shoulder",
      name: "Shoulder Through",
      kind: "Spell",
      energy: 3,
      keywords: [],
      text: "A unit gets +3 Might this turn. If it conquers this turn, draw 1.",
    },
    {
      slug: "war-anvil",
      name: "War Anvil",
      kind: "Gear",
      energy: 2,
      keywords: [],
      text: "Units you play get +1 Might.",
    },
  ],
  Chaos: [
    {
      slug: "scrap-imp",
      name: "Scrap Imp",
      kind: "Unit",
      energy: 1,
      might: 2,
      keywords: [],
      text: "When I die, draw 1, then discard 1.",
    },
    {
      slug: "alley-hexer",
      name: "Alley Hexer",
      kind: "Unit",
      energy: 2,
      might: 2,
      keywords: [],
      text: "When I enter, discard 1, then draw 1.",
    },
    {
      slug: "trash-witch",
      name: "Trash Witch",
      kind: "Unit",
      energy: 3,
      might: 3,
      keywords: [],
      text: "You may play me from your trash by recycling a rune. If you do, kill me at end of turn.",
    },
    {
      slug: "riot-caller",
      name: "Riot Caller",
      kind: "Unit",
      energy: 4,
      might: 4,
      keywords: ["Assault"],
      text: "Assault 1. When you discard a card, I get +1 Might this turn.",
    },
    {
      slug: "hex-pop",
      name: "Hex Pop",
      kind: "Spell",
      energy: 1,
      keywords: ["Reaction"],
      text: "Reaction: deal 3 damage to a unit. Recycle a rune.",
    },
    {
      slug: "wild-swap",
      name: "Wild Swap",
      kind: "Spell",
      energy: 2,
      keywords: [],
      text: "Discard up to 2, then draw that many plus 1.",
    },
    {
      slug: "engine",
      name: "Chaos Engine",
      kind: "Gear",
      energy: 3,
      keywords: [],
      text: "Exhaust, discard 1: ready a unit you control.",
    },
  ],
  Order: [
    {
      slug: "banner-page",
      name: "Banner Page",
      kind: "Unit",
      energy: 1,
      might: 2,
      keywords: [],
      text: "When I enter, play a 1 Might Recruit token at my location.",
    },
    {
      slug: "line-sergeant",
      name: "Line Sergeant",
      kind: "Unit",
      energy: 2,
      might: 3,
      keywords: [],
      text: "Other units you control at my battlefield get +1 Might.",
    },
    {
      slug: "standard-bearer",
      name: "Standard Bearer",
      kind: "Unit",
      energy: 3,
      might: 3,
      keywords: [],
      text: "When I enter, ready another unit you control.",
    },
    {
      slug: "phalanx",
      name: "Phalanx",
      kind: "Unit",
      energy: 4,
      might: 5,
      keywords: ["Deflect"],
      text: "Deflect 1. Other units you control at my battlefield have Deflect 1.",
    },
    {
      slug: "muster",
      name: "Muster",
      kind: "Spell",
      energy: 2,
      keywords: [],
      text: "Play two 1 Might Recruit tokens at a battlefield you control.",
    },
    {
      slug: "decree",
      name: "Decree",
      kind: "Spell",
      energy: 1,
      keywords: ["Reaction"],
      text: "Reaction: a unit gets +1 Might this turn for each other unit you control at its battlefield.",
    },
    {
      slug: "civic-seal",
      name: "Civic Seal",
      kind: "Gear",
      energy: 3,
      keywords: [],
      text: "At the start of your turn, play a 1 Might Recruit token at your base.",
    },
  ],
};

type LegendSeed = {
  id: string;
  name: string;
  champion: string;
  domains: [Domain, Domain];
  set: "Origins" | "Radiance";
  text: string;
  source: CardSource;
  signature: {
    name: string;
    kind: "Spell" | "Gear";
    energy: number;
    text: string;
    source: CardSource;
    keywords: string[];
  };
  champions: Array<{
    id: string;
    name: string;
    domain: Domain;
    energy: number;
    might: number;
    text: string;
    keywords: string[];
    source: CardSource;
  }>;
};

const FRONT: Record<Domain, { text: string; keywords: string[] }> = {
  Fury: {
    keywords: ["Accelerate", "Assault"],
    text: "Accelerate — pay 1 Energy to enter ready. Assault 1. When you conquer, you may discard 1 to draw 1.",
  },
  Calm: {
    keywords: ["Deflect"],
    text: "Deflect 1. When I enter a battlefield, ready a unit you control there.",
  },
  Mind: {
    keywords: [],
    text: "When I enter, draw 1. The next spell you play this turn costs 1 less Energy.",
  },
  Body: {
    keywords: ["Assault"],
    text: "Assault 1. I take 1 less combat damage.",
  },
  Chaos: {
    keywords: [],
    text: "When I enter, discard 1, then draw 1. When you discard a card, I get +1 Might this turn.",
  },
  Order: {
    keywords: [],
    text: "When I enter, play a 1 Might Recruit token at my location.",
  },
};

const APEX: Record<Domain, { text: string; keywords: string[] }> = {
  Fury: {
    keywords: ["Assault"],
    text: "Assault 2. When I enter, deal 2 damage to an enemy unit at my battlefield.",
  },
  Calm: {
    keywords: ["Deflect"],
    text: "Deflect 2. At the start of your turn, if I am at a battlefield you hold, draw 1.",
  },
  Mind: {
    keywords: ["Hidden"],
    text: "Hidden. When I turn face up, draw 2, then discard 1.",
  },
  Body: {
    keywords: ["Stun"],
    text: "When I enter, stun an enemy unit here. Assault 1.",
  },
  Chaos: {
    keywords: [],
    text: "You may play me from your trash by recycling a rune. If you do, I get +2 Might this turn.",
  },
  Order: {
    keywords: ["Deflect"],
    text: "Other units you control at my battlefield get +1 Might and Deflect 1.",
  },
};

function practiceChampions(
  id: string,
  champion: string,
  domains: [Domain, Domain],
): LegendSeed["champions"] {
  return domains.map((domain, index) => {
    const pack = index === 0 ? FRONT[domain] : APEX[domain];
    const epithet = index === 0 ? "Vanguard" : "Apex";
    return {
      id: `${id}-${index === 0 ? "vanguard" : "apex"}`,
      name: `${champion}, ${epithet}`,
      domain,
      energy: index === 0 ? 3 : 5,
      might: index === 0 ? 4 : 5,
      text: pack.text,
      keywords: pack.keywords,
      source: "practice" as const,
    };
  });
}

const LEGEND_SEEDS: LegendSeed[] = [
  {
    id: "jinx",
    name: "Jinx, Loose Cannon",
    champion: "Jinx",
    domains: ["Fury", "Chaos"],
    set: "Origins",
    source: "gallery",
    text: "At the start of your Beginning Phase, draw 1 if you have one or fewer cards in your hand.",
    signature: {
      name: "Super Mega Death Rocket!",
      kind: "Spell",
      energy: 4,
      keywords: [],
      source: "gallery",
      text: "Deal 5 damage to a unit. When you conquer, you may discard 1 to return this from your trash to your hand.",
    },
    champions: [
      {
        id: "jinx-demolitionist",
        name: "Jinx, Demolitionist",
        domain: "Fury",
        energy: 3,
        might: 4,
        keywords: ["Accelerate", "Assault"],
        source: "gallery",
        text: "Accelerate — you may pay 1 Energy and 1 Fury Power to enter ready. Assault 2. When you play me, discard 2.",
      },
      {
        id: "jinx-rebel",
        name: "Jinx, Rebel",
        domain: "Chaos",
        energy: 5,
        might: 5,
        keywords: [],
        source: "gallery",
        text: "When you discard one or more cards, ready me and give me +1 Might this turn.",
      },
    ],
  },
  {
    id: "viktor",
    name: "Viktor, Herald of the Arcane",
    champion: "Viktor",
    domains: ["Mind", "Order"],
    set: "Origins",
    source: "gallery",
    text: "1 Energy, Exhaust: play a 1 Might Recruit unit token.",
    signature: {
      name: "Siphon Power",
      kind: "Spell",
      energy: 2,
      keywords: [],
      source: "summary",
      text: "Practice stand-in. Draw 2. A unit gets −1 Might this turn.",
    },
    champions: [
      {
        id: "viktor-innovator",
        name: "Viktor, Innovator",
        domain: "Mind",
        energy: 3,
        might: 3,
        keywords: [],
        source: "practice",
        text: "Public name, practice wording. When I enter, draw 1. The next Gear you play this turn costs 1 less Energy.",
      },
      {
        id: "viktor-leader",
        name: "Viktor, Leader",
        domain: "Order",
        energy: 5,
        might: 5,
        keywords: [],
        source: "practice",
        text: "Public name, practice wording. When I enter, play two 1 Might Recruit tokens at my location.",
      },
    ],
  },
  {
    id: "ahri",
    name: "Ahri, Nine-Tailed Fox",
    champion: "Ahri",
    domains: ["Calm", "Mind"],
    set: "Origins",
    source: "gallery",
    text: "When an enemy unit attacks a battlefield you control, it gets −1 Might this turn, to a minimum of 1.",
    signature: {
      name: "Charm",
      kind: "Spell",
      energy: 2,
      keywords: ["Reaction"],
      source: "practice",
      text: "Practice stand-in. Reaction: exhaust a unit. Draw 1.",
    },
    champions: practiceChampions("ahri", "Ahri", ["Calm", "Mind"]),
  },
  {
    id: "ekko",
    name: "Ekko, Boy Who Shattered Time",
    champion: "Ekko",
    domains: ["Fury", "Mind"],
    set: "Radiance",
    source: "summary",
    text: "1 Energy, Exhaust: the next unit you play this turn costs 2 Energy and 1 Power less. Kill that unit at end of turn.",
    signature: {
      name: "Chronobreak",
      kind: "Spell",
      energy: 3,
      keywords: ["Reaction"],
      source: "summary",
      text: "Public name. Practice effect: Reaction — return a unit you control to your hand, then play a unit that costs 1 less.",
    },
    champions: practiceChampions("ekko", "Ekko", ["Fury", "Mind"]),
  },
  {
    id: "ziggs",
    name: "Ziggs, Hexplosives Expert",
    champion: "Ziggs",
    domains: ["Fury", "Chaos"],
    set: "Radiance",
    source: "summary",
    text: "1 Energy, 1 Power, Exhaust: play a Bomb gear token. When it dies, it deals 2 damage to an enemy here and kills your other Bombs there.",
    signature: {
      name: "Hexplosive Minefield",
      kind: "Spell",
      energy: 3,
      keywords: [],
      source: "summary",
      text: "Public name. Practice effect: deal 2 damage to each enemy unit at a battlefield.",
    },
    champions: practiceChampions("ziggs", "Ziggs", ["Fury", "Chaos"]),
  },
  {
    id: "mordekaiser",
    name: "Mordekaiser, Iron Revenant",
    champion: "Mordekaiser",
    domains: ["Fury", "Order"],
    set: "Radiance",
    source: "summary",
    text: "Reaction: banish a unit or gear from your trash and exhaust me to add 1 Power of any domain, spendable only on units or gear.",
    signature: {
      name: "Realm of Death",
      kind: "Spell",
      energy: 4,
      keywords: [],
      source: "summary",
      text: "Public name. Practice effect: stun each enemy unit at a battlefield. Draw 1.",
    },
    champions: practiceChampions("mordekaiser", "Mordekaiser", ["Fury", "Order"]),
  },
  {
    id: "orianna",
    name: "Orianna, Lady of Clockwork",
    champion: "Orianna",
    domains: ["Calm", "Mind"],
    set: "Radiance",
    source: "summary",
    text: "At the start of your Main Phase, you may pay 1 Energy and choose a friendly gear. It becomes a unit with Might equal to its Energy cost until you choose another.",
    signature: {
      name: "The Ball",
      kind: "Gear",
      energy: 2,
      keywords: ["Equip"],
      source: "summary",
      text: "Public name. Practice effect: Equip — attached unit gets +1 Might. Exhaust: move it to another battlefield you contest.",
    },
    champions: practiceChampions("orianna", "Orianna", ["Calm", "Mind"]),
  },
  {
    id: "ksante",
    name: "K'Sante, Pride of Nazumah",
    champion: "K'Sante",
    domains: ["Calm", "Body"],
    set: "Radiance",
    source: "summary",
    text: "1 Energy, Exhaust: a friendly unit gets Assault this turn equal to its Deflect.",
    signature: {
      name: "Ntofo Strikes",
      kind: "Spell",
      energy: 2,
      keywords: ["Reaction"],
      source: "summary",
      text: "Public name. Practice effect: Reaction — a unit gets +3 Might this turn and Deflect 1.",
    },
    champions: practiceChampions("ksante", "K'Sante", ["Calm", "Body"]),
  },
  {
    id: "riven",
    name: "Riven, The Exile",
    champion: "Riven",
    domains: ["Calm", "Chaos"],
    set: "Radiance",
    source: "summary",
    text: "Units you play to battlefields you control enter ready.",
    signature: {
      name: "Blade of the Exile",
      kind: "Gear",
      energy: 3,
      keywords: ["Equip"],
      source: "summary",
      text: "Public name. Practice effect: Equip — attached unit has Assault 2.",
    },
    champions: practiceChampions("riven", "Riven", ["Calm", "Chaos"]),
  },
  {
    id: "seraphine",
    name: "Seraphine, Starry-Eyed Songstress",
    champion: "Seraphine",
    domains: ["Mind", "Order"],
    set: "Radiance",
    source: "summary",
    text: "As an extra cost to play a spell, you may exhaust me and three friendly units to reduce that spell's Energy cost by 2.",
    signature: {
      name: "Encore",
      kind: "Spell",
      energy: 2,
      keywords: [],
      source: "summary",
      text: "Public name. Practice effect: copy the next spell you play this turn. That copy costs 0.",
    },
    champions: practiceChampions("seraphine", "Seraphine", ["Mind", "Order"]),
  },
  {
    id: "evelynn",
    name: "Evelynn, Agony's Embrace",
    champion: "Evelynn",
    domains: ["Body", "Chaos"],
    set: "Radiance",
    source: "summary",
    text: "Once each turn, when you play a card from face down, draw 1. If it is not your turn, also discard 1.",
    signature: {
      name: "Last Caress",
      kind: "Spell",
      energy: 3,
      keywords: [],
      source: "summary",
      text: "Public name. Practice effect: kill a unit with Might 3 or less. If it was stunned, draw 1.",
    },
    champions: practiceChampions("evelynn", "Evelynn", ["Body", "Chaos"]),
  },
  {
    id: "jarvan",
    name: "Jarvan IV, Exemplar of Demacia",
    champion: "Jarvan IV",
    domains: ["Body", "Order"],
    set: "Radiance",
    source: "summary",
    text: "When you play a gear with Deploy, you may exhaust me and pay 1 Power to move a friendly unit to that battlefield.",
    signature: {
      name: "Demacian Standard",
      kind: "Gear",
      energy: 3,
      keywords: ["Deploy"],
      source: "summary",
      text: "Public name. Practice effect: Deploy — play me to a battlefield. Units you control there get +1 Might.",
    },
    champions: practiceChampions("jarvan", "Jarvan IV", ["Body", "Order"]),
  },
];

function powerOf(domain: Domain, amount = 1): Partial<Record<Domain, number>> {
  return { [domain]: amount };
}

function assemble(): Card[] {
  const cards: Card[] = [];

  for (const domain of DOMAINS) {
    for (const spec of PRACTICE[domain]) {
      cards.push({
        id: `p-${domain.toLowerCase()}-${spec.slug}`,
        name: spec.name,
        kind: spec.kind,
        domains: [domain],
        energy: spec.energy,
        power: powerOf(domain, spec.power ?? 1),
        might: spec.might,
        text: spec.text,
        keywords: spec.keywords,
        set: "Practice",
        source: "practice",
      });
    }
    cards.push({
      id: `rune-${domain.toLowerCase()}`,
      name: `${domain} Rune`,
      kind: "Rune",
      domains: [domain],
      energy: 0,
      power: {},
      text: "Exhaust: add 1 Energy. Recycle: add 1 Power of this domain and put this rune on the bottom of your rune deck.",
      keywords: [],
      set: "Origins",
      source: "summary",
    });
  }

  for (const seed of LEGEND_SEEDS) {
    cards.push({
      id: seed.id,
      name: seed.name,
      kind: "Legend",
      domains: seed.domains,
      energy: 0,
      power: {},
      text: seed.text,
      keywords: [],
      set: seed.set,
      source: seed.source,
      champion: seed.champion,
    });
    cards.push({
      id: `sig-${seed.id}`,
      name: seed.signature.name,
      kind: seed.signature.kind,
      domains: seed.domains,
      energy: seed.signature.energy,
      power: { [seed.domains[0]]: 1, [seed.domains[1]]: 1 },
      text: seed.signature.text,
      keywords: seed.signature.keywords,
      set: seed.set,
      source: seed.signature.source,
      champion: seed.champion,
      signatureFor: seed.champion,
    });
    for (const champ of seed.champions) {
      cards.push({
        id: champ.id,
        name: champ.name,
        kind: "Champion",
        domains: [champ.domain],
        energy: champ.energy,
        power: powerOf(champ.domain),
        might: champ.might,
        text: champ.text,
        keywords: champ.keywords,
        set: seed.set,
        source: champ.source,
        champion: seed.champion,
      });
    }
  }

  const fields: Array<[string, string, string]> = [
    ["bf-glass", "Glass Harbor", "When you hold me, the next spell you play this turn costs 1 less Energy."],
    ["bf-ash", "Ash Steps", "Units you move here enter ready."],
    ["bf-clock", "Clockyard", "When you conquer me, draw 1."],
    ["bf-moon", "Moonwell Ridge", "Units here get +1 Might while you hold me."],
    ["bf-banner", "Banner Court", "When you play a unit here, play a 1 Might Recruit token at your base."],
    ["bf-neon", "Neon Undercroft", "When you conquer me, you may discard 1 and draw 1."],
  ];
  for (const [id, name, text] of fields) {
    cards.push({
      id,
      name,
      kind: "Battlefield",
      domains: [],
      energy: 0,
      power: {},
      text,
      keywords: [],
      set: "Practice",
      source: "practice",
    });
  }

  return cards;
}

import { POOL } from "@/data/pool";

export const CARDS: Card[] = POOL;

export const CARD_BY_ID: Record<string, Card> = Object.fromEntries(CARDS.map((card) => [card.id, card]));

export const LEGENDS: Card[] = CARDS.filter((card) => card.kind === "Legend");

export const BATTLEFIELDS: Card[] = CARDS.filter((card) => card.kind === "Battlefield");

export function legendById(id: string | null | undefined): Card | null {
  if (!id) return null;
  const card = CARD_BY_ID[id];
  return card?.kind === "Legend" ? card : null;
}

export function championsFor(legend: Card): Card[] {
  return CARDS.filter((card) => card.kind === "Champion" && card.champion === legend.champion);
}

export const SOURCE_NOTE: Record<CardSource, string> = {
  gallery: "Wording follows a public gallery writeup.",
  summary: "Shortened from a public writeup. Not full oracle text.",
  practice: "Practice card. Built so curves, filters, and legality work offline.",
};

export const KEYWORD_GLOSSARY: { name: string; text: string }[] = [
  {
    name: "Accelerate",
    text: "Pay an extra cost so the unit enters ready instead of exhausted.",
  },
  {
    name: "Assault",
    text: "Bonus Might while the unit is attacking. Assault 2 means +2 Might on the attack.",
  },
  {
    name: "Deflect",
    text: "Opponents pay extra Power each time they choose this object.",
  },
  {
    name: "Stun",
    text: "The unit deals no combat damage. Its Might does not change. Stun clears at end of turn.",
  },
  {
    name: "Reaction",
    text: "The spell can be played on a reaction window, including during combat, not only your main phase.",
  },
  {
    name: "Action",
    text: "A wider play window than a normal spell, still tighter than a reaction.",
  },
  {
    name: "Hidden",
    text: "Play face down, then turn up later by paying the cost. Practice cards shorten the real timing.",
  },
  {
    name: "Equip",
    text: "Pay to attach an equipment gear to a unit you control, usually in your main phase.",
  },
  {
    name: "Deploy",
    text: "Play the gear straight onto a battlefield. It stays useful until an opponent holds that field.",
  },
];
