export type Size = [number, number];
export type Item = {
  id: string;
  name: string;
  category: string;
  kind: string;
  size: Size;
  price: number;
  priceKnown?: boolean;
  weight: number;
  icon: string;
  source: string;
  wiki: string;
  description: string;
  stats: { key: string; value: string | number; unit: string }[];
  seasonal: boolean;
  eligible: boolean;
  compartments?: Size[];
  tier?: number;
  ammoTag?: string;
  caliber?: string;
  capacity?: number;
};
export type Slot =
  "helmet" | "armor" | "rig" | "bag" | "gun" | "second" | "headset" | "face";
export const slots: Slot[] = [
  "helmet",
  "armor",
  "rig",
  "bag",
  "gun",
  "second",
  "headset",
  "face",
];
export type Equipment = {
  id: string;
  quantity: number;
  children: Equipment[];
  ammoId?: string;
  rounds?: number;
  partLocks?: string[];
};
export type Supply = {
  uid: string;
  id: string;
  quantity: number;
  size: Size;
  role?: "gun-mag" | "spare-mag" | "reserve" | "essential" | "extra";
  gun?: Slot;
  ammoId?: string;
  rounds?: number;
  container?: string;
  x?: number;
  y?: number;
  rotated?: boolean;
};
export type Compartment = { id: string; size: Size; secure?: boolean };
export type Settings = {
  primaryChance: number;
  secondChance: number;
  sidearmOnly: boolean;
  attachmentDensity: "bare" | "mixed" | "full";
  randomizeAttachments: boolean;
  supportingParts: "automatic" | "manual";
  looseRounds: number;
  magazines: number;
  ammoMode: "gun" | "magazine";
  storeGunMag: boolean;
  grenades: number;
  food: number;
  drinks: number;
  extraMeds: number;
  budget: number;
  minBudget: number;
  squadBudget: number;
  priceRules: "margin" | "strict" | "informational";
  priceMargin: number;
  medical: boolean;
  ammo: boolean;
  mastery: boolean;
  allowCore: boolean;
  masteryPoints: number;
  masteryExcluded: string[];
  masteryWeights: Record<string, number>;
  coreUnlocked: string[];
  categories: Record<Slot, boolean>;
  fixed: Partial<Record<Slot, string>>;
  excluded: string[];
  weights: Record<string, number>;
  maps: string[];
  modes: string[];
  mapWeights: Record<string, number>;
  modeWeights: Record<string, number>;
  sound: boolean;
  volume: number;
  reducedMotion: boolean;
  reveal: "full" | "quick" | "instant";
  theme: "dark" | "light" | "system";
  saveFixed: boolean;
  avoidRepeats: boolean;
  repeatFallback: boolean;
  secureAmmo: boolean;
  packing: "supplies" | "storage" | "reroll";
};
export type Kit = {
  id: string;
  seed: string;
  created: string;
  dataVersion: string;
  map: string;
  mode: string;
  gear: Partial<Record<Slot, Equipment>>;
  supplies: Supply[];
  locks: Slot[];
  locked: boolean;
  checked: string[];
  notices: string[];
  settings: Settings;
  mastery?: {
    skills: Record<string, number>;
    core?: string;
    locks: string[];
    locked: boolean;
  };
};
export type Issue = {
  severity: "error" | "notice";
  text: string;
  code?: "price-estimate" | "attachment-estimate" | "wearable-estimate";
};
export type LibraryEntry = {
  id: string;
  name: string;
  date: string;
  kits: Kit[];
  favorite: boolean;
};
export type ChallengeRule = {
  when: "win" | "loss";
  field:
    "primaryChance" | "secondChance" | "budget" | "grenades" | "looseRounds";
  operation: "set" | "add";
  value: number;
};
export type Challenge = {
  id: string;
  name: string;
  notes: string;
  wins: number;
  losses: number;
  streak: number;
  rules: ChallengeRule[];
  settings: Settings;
};
export type Library = {
  version: 1;
  settings: Settings;
  presets: { id: string; name: string; settings: Settings }[];
  history: LibraryEntry[];
  saved: LibraryEntry[];
  challenges: Challenge[];
};
