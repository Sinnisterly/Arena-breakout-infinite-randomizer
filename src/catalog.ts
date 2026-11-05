import assemblyPlans from "./data/weapon-plans.json";
import type { WeaponPlan } from "./weapon-schema";
import snapshot from "./data/catalog.json";
import stockPortraits from "./data/weapon-portraits.json";
import type { Item } from "./types";
export const dataVersion = snapshot.version;
export const catalog = snapshot.items as unknown as Item[];
export const weaponPortraits: Record<string, { path: string; source: string }> =
  stockPortraits;
export function displayIcon(item: Item) {
  return item.kind === "weapon"
    ? (weaponPortraits[item.id]?.path ?? "assets/missing-item.svg")
    : item.icon;
}
export const byId: Record<string, Item> = Object.fromEntries(
  catalog.map((item) => [item.id, item]),
);
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
export const money = (amount: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount);
export const sources = [
  {
    name: "is.gd",
    url: "https://is.gd/apishorteningreference.php",
    note: "Short redirects created on opening Share and cached locally. The full loadout link is sent to this service; no API key is embedded.",
  },
  {
    name: "SO1O's ABI Gun Builds",
    url: "https://docs.google.com/spreadsheets/d/1WNkmeWRRZm74_FuDeTpHkTlwBP1kXt_GpVaVLgWP5VE/edit?gid=1547895728",
    note: "Build-code reference, updated October 23, 2026. Build codes do not expose a complete attachment relationship table.",
  },
  {
    name: "Arena Breakout: Infinite",
    url: "https://www.arenabreakoutinfinite.com/en/index.html",
    note: "Game, game item artwork, and official rules. Game artwork belongs to its respective owners.",
  },
  {
    name: "ABI Tracker / hexaov91",
    url: "https://abi-tracker.azurewebsites.net/?lang=en",
    note: "Local item, weapon, ammunition, armor, and icon snapshot captured November 5, 2026. No live polling.",
  },
  {
    name: "ABIBuilder",
    url: "https://abibuilder.com/wiki",
    note: "Map photos, complete stock-weapon portraits, equipment references, builds, and mastery research.",
  },
  {
    name: "ABIDB / fabiopsyduck",
    url: "https://github.com/fabiopsyduck/ABIDB-WEB",
    note: "Equipment categories and compartment layouts. MIT.",
  },
  {
    name: "ABI API / WilliamFerrant",
    url: "https://github.com/WilliamFerrant/abi-api",
    note: "Item and icon reference during design research.",
  },
  {
    name: "Arena Breakout Infinite Wiki",
    url: "https://arena-breakout-infinite.fandom.com/wiki/Main",
    note: "Item reference links and cross-checks.",
  },
  {
    name: "Kenney Impact Sounds",
    url: "https://kenney.nl/assets/impact-sounds",
    note: "Mechanical impact samples. CC0. License bundled with the app.",
  },
  {
    name: "Tarkov Stammtisch",
    url: "https://tarkov-stammtisch.de/en/roulette",
    note: "Early randomizer reference.",
  },
  {
    name: "Sinnisterly / ROTMG randomizer",
    url: "https://github.com/Sinnisterly/rotmgrandomizer",
    note: "Interaction and personality reference. No source code copied.",
  },
];
export const modeSource =
  "https://www.arenabreakoutinfinite.com/en/news.html?content_id=d25657b0ad464a4634a91bea70f57c69e66f";
export const modeSources = [
  {
    name: "Normal ceiling and base map availability",
    url: "https://www.arenabreakoutinfinite.com/en/news.html?content_id=69683e0ca7baca4e7caa42ea4d544a329a0e",
  },
  {
    name: "Entry-value floors",
    url: "https://steamcommunity.com/games/2073620/announcements/detail/509598976349046466",
  },
  {
    name: "Lockdown ceiling",
    url: "https://www.arenabreakoutinfinite.com/en/news.html?content_id=354c7d59ab801a4682ab202a637231165ca4",
  },
  { name: "Season 7 caps and replacements", url: modeSource },
];
export const maps = [
  {
    id: "farm",
    name: "Farm",
    image: "map-farm.webp",
    modes: ["normal", "lockdown"],
  },
  {
    id: "valley",
    name: "Valley",
    image: "map-valley.png",
    modes: ["normal"],
  },
  {
    id: "northridge",
    name: "Northridge",
    image: "map-northridge.png",
    modes: ["lockdown", "forbidden"],
  },
  {
    id: "armory",
    name: "Armory",
    image: "map-armory.webp",
    modes: ["lockdown", "forbidden"],
  },
  {
    id: "tv-station",
    name: "TV Station",
    image: "map-tv-station.webp",
    modes: ["lockdown", "forbidden"],
  },
  {
    id: "airport",
    name: "Airport",
    image: "map-airport.webp",
    modes: ["lockdown"],
  },
];
export const modes: Record<
  string,
  {
    name: string;
    tier: number;
    min: number;
    max: number;
    fee: number;
    color: string;
  }
> = {
  normal: {
    name: "Normal",
    tier: 4,
    min: 0,
    max: 300000,
    fee: 0,
    color: "#f0eee3",
  },
  lockdown: {
    name: "Lockdown",
    tier: 5,
    min: 150000,
    max: 900000,
    fee: 20000,
    color: "#f0c45b",
  },
  forbidden: {
    name: "Forbidden",
    tier: 7,
    min: 450000,
    max: Infinity,
    fee: 50000,
    color: "#ff7469",
  },
};
export type { PartChoice, WeaponPlan } from "./weapon-schema";
export const allWeaponPlans = assemblyPlans as WeaponPlan[];
export const weaponPlans = allWeaponPlans.filter((plan) => !plan.availability);
export const isSidearm = (id: string) =>
  id.startsWith("102") || id.startsWith("192");
