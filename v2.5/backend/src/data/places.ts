export type LocalHit = {
  id: string;
  countries: string[];
  game: "rift" | "magic";
  name: string;
  player: string;
  place: string;
  event: string;
  line: string;
  /** Rift list id that opens the full card list. */
  listId?: string;
};

export const LOCAL_HITS: LocalHit[] = [
  {
    id: "us-jinx",
    countries: ["United States"],
    game: "rift",
    name: "Jinx",
    player: "Eric Liu",
    place: "130th",
    event: "Houston Regional Qualifier",
    line: "Chosen champion Jinx, Rebel. Also runs Vi, Kai'Sa, and Darius. Signature is Super Mega Death Rocket!",
    listId: "local-jinx",
  },
  {
    id: "us-riven",
    countries: ["United States"],
    game: "rift",
    name: "Riven, The Exile",
    player: "NicT17",
    place: "1st",
    event: "SCG CON Hartford $10K",
    line: "Chosen champion Riven, Broken Blade. Signature is Blade of the Exile.",
    listId: "local-riven",
  },
  {
    id: "cn-riven",
    countries: ["China"],
    game: "rift",
    name: "瑞雯",
    player: "菠菠的妙妙卡牌屋",
    place: "1st",
    event: "卡之域卡牌 BO3, 16 players",
    line: "Riven took the local. The 40 was not reprinted here.",
  },
  {
    id: "cn-frog",
    countries: ["China"],
    game: "rift",
    name: "蛙撅鸡",
    player: "撸蛇",
    place: "2nd",
    event: "卡之域卡牌 BO3, 16 players",
    line: "Second at the same China local.",
  },
  {
    id: "cn-orianna",
    countries: ["China"],
    game: "rift",
    name: "奥利安娜",
    player: "东东卡牌妙妙屋",
    place: "3rd",
    event: "卡之域卡牌 BO3, 16 players",
    line: "Orianna, third at the same China local.",
  },
  {
    id: "sg-jayce",
    countries: ["Singapore"],
    game: "rift",
    name: "Jayce",
    player: "justmilkey",
    place: "Best of",
    event: "Singapore Regional Qualifier",
    line: "Mind / Body. Jayce, Brilliant Inventor is the chosen champion.",
    listId: "local-sg-jayce",
  },
  {
    id: "sg-akali",
    countries: ["Singapore"],
    game: "rift",
    name: "Akali",
    player: "Gorica",
    place: "1st",
    event: "Singapore Regional Qualifier",
    line: "Fury / Calm. Chosen champion Akali, Deadly Weapon. Signature is Shuriken Flip.",
    listId: "local-sg-akali",
  },
  {
    id: "sg-azir",
    countries: ["Singapore"],
    game: "rift",
    name: "Azir",
    player: "MICE Squirtle",
    place: "10th",
    event: "Singapore Regional Qualifier",
    line: "Calm / Order. Chosen champion Azir, Sovereign.",
    listId: "local-sg-azir",
  },
  {
    id: "anz-landfall",
    countries: ["Australia", "New Zealand"],
    game: "magic",
    name: "Mono-Green Landfall",
    player: "Simon Linabury",
    place: "1st",
    event: "ANZ Super Series, Standard",
    line: "Won the Australia and New Zealand regional on Landfall.",
  },
  {
    id: "jp-bant",
    countries: ["Japan", "South Korea"],
    game: "magic",
    name: "Bant Rhythm",
    player: "Ma Noah",
    place: "1st",
    event: "Champions Cup Final, Japan and Korea",
    line: "Won the Japan and Korea regional.",
  },
  {
    id: "jp-momo",
    countries: ["Japan", "South Korea"],
    game: "magic",
    name: "Momo White",
    player: "Tase Yuya",
    place: "2nd",
    event: "Champions Cup Final, Japan and Korea",
    line: "Lost the final to Bant Rhythm.",
  },
  {
    id: "sea-izzet",
    countries: ["Singapore", "Malaysia"],
    game: "magic",
    name: "Izzet Elementals",
    player: "Richmond Tan",
    place: "1st",
    event: "Southeast Asia Regional Championship",
    line: "Won the Southeast Asia Standard regional.",
  },
];

export function hitsFor(country: string | null, game: "rift" | "magic"): LocalHit[] {
  if (!country) return [];
  return LOCAL_HITS.filter((hit) => hit.game === game && hit.countries.includes(country));
}
