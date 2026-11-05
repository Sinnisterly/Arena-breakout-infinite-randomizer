import LZString from "lz-string";
import { compactShare, expandShare } from "./share-codec";
import { defaults } from "./engine";
import {
  slots,
  type Equipment,
  type Kit,
  type Library,
  type Settings,
} from "./types";

const key = "abi-armory-v1";
function fail(): never {
  throw new Error("This file or link is not a supported armory save.");
}
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : fail();
const str = (value: unknown, max = 300) =>
  typeof value === "string" && value.length <= max ? value : fail();
const num = (value: unknown, min = 0, max = 100000000) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max
    ? value
    : fail();
const integer = (value: unknown, min: number, max: number) => {
  const n = num(value, min, max);
  return Number.isInteger(n) ? n : fail();
};
function strings(value: unknown, max = 3000) {
  if (!Array.isArray(value) || value.length > max) return fail();
  return value.map((x) => str(x));
}
export function readSettings(input: unknown): Settings {
  const value = object(input),
    result = structuredClone(defaults);
  for (const k of ["primaryChance", "secondChance", "volume"] as const)
    if (k in value) result[k] = num(value[k], 0, 100);
  for (const k of [
    "grenades",
    "food",
    "drinks",
    "extraMeds",
    "magazines",
  ] as const)
    if (k in value)
      result[k] = Math.floor(num(value[k], k === "magazines" ? 1 : 0, 20));
  if ("looseRounds" in value)
    result.looseRounds = Math.floor(num(value.looseRounds, 60, 600));
  if ("masteryPoints" in value)
    result.masteryPoints = integer(value.masteryPoints, 0, 12);
  if ("priceMargin" in value)
    result.priceMargin = num(value.priceMargin, 0, 100);
  for (const k of ["budget", "minBudget", "squadBudget"] as const)
    if (k in value) result[k] = num(value[k]);
  for (const k of [
    "sidearmOnly",
    "storeGunMag",
    "medical",
    "ammo",
    "mastery",
    "allowCore",
    "sound",
    "reducedMotion",
    "saveFixed",
    "avoidRepeats",
    "repeatFallback",
    "secureAmmo",
    "randomizeAttachments",
  ] as const)
    if (k in value) {
      if (typeof value[k] !== "boolean") fail();
      result[k] = value[k] as boolean;
    }
  for (const [k, valid] of Object.entries({
    attachmentDensity: ["bare", "mixed", "full"],
    supportingParts: ["automatic", "manual"],
    ammoMode: ["gun", "magazine"],
    reveal: ["full", "quick", "instant"],
    theme: ["dark", "light", "system"],
    packing: ["supplies", "storage", "reroll"],
    priceRules: ["margin", "strict", "informational"],
  }))
    if (k in value) {
      if (!valid.includes(String(value[k]))) fail();
      Object.assign(result, { [k]: value[k] });
    }
  for (const k of [
    "excluded",
    "maps",
    "modes",
    "masteryExcluded",
    "coreUnlocked",
  ] as const)
    if (k in value) result[k] = strings(value[k]);
  for (const k of [
    "weights",
    "mapWeights",
    "modeWeights",
    "masteryWeights",
  ] as const)
    if (k in value)
      result[k] = Object.fromEntries(
        Object.entries(object(value[k]))
          .slice(0, 3000)
          .map(([id, weight]) => [str(id), num(weight, 0, 1000)]),
      );
  if (value.categories)
    for (const slot of slots) {
      const v = object(value.categories)[slot];
      if (typeof v === "boolean") result.categories[slot] = v;
    }
  if (value.fixed)
    for (const slot of slots) {
      const v = object(value.fixed)[slot];
      if (v !== undefined) result.fixed[slot] = str(v);
    }
  return result;
}
export function readKit(input: unknown): Kit {
  const value = object(input);
  function node(input: unknown, depth = 0): Equipment {
    if (depth > 5) fail();
    const n = object(input);
    if (!Array.isArray(n.children) || n.children.length > 40) fail();
    return {
      id: str(n.id),
      quantity: integer(n.quantity, 1, 600),
      children: n.children.map((x) => node(x, depth + 1)),
      ...(n.ammoId !== undefined
        ? { ammoId: str(n.ammoId), rounds: integer(n.rounds, 1, 200) }
        : {}),
      ...(n.partLocks ? { partLocks: strings(n.partLocks, 40) } : {}),
    };
  }
  const gear: Kit["gear"] = {};
  for (const slot of slots) {
    const n = object(value.gear)[slot];
    if (n !== undefined && n !== null) gear[slot] = node(n);
  }
  if (!Array.isArray(value.supplies) || value.supplies.length > 150) fail();
  const supplies = value.supplies.map((input) => {
    const s = object(input);
    if (!Array.isArray(s.size) || s.size.length !== 2) fail();
    const role =
      s.role === undefined
        ? undefined
        : (str(s.role) as Kit["supplies"][number]["role"]);
    if (
      role &&
      !["gun-mag", "spare-mag", "reserve", "essential", "extra"].includes(role)
    )
      fail();
    const gun =
      s.gun === undefined ? undefined : (str(s.gun) as "gun" | "second");
    if (gun && !["gun", "second"].includes(gun)) fail();
    return {
      uid: str(s.uid),
      id: str(s.id),
      quantity: integer(s.quantity, 1, 600),
      size: [integer(s.size[0], 1, 10), integer(s.size[1], 1, 10)] as [
        number,
        number,
      ],
      role,
      gun,
      ...(s.container !== undefined
        ? {
            container: str(s.container),
            x: integer(s.x, 0, 20),
            y: integer(s.y, 0, 20),
            rotated: !!s.rotated,
          }
        : {}),
      ...(s.ammoId !== undefined
        ? { ammoId: str(s.ammoId), rounds: integer(s.rounds, 1, 200) }
        : {}),
    };
  });
  let mastery: Kit["mastery"];
  if (value.mastery) {
    const m = object(value.mastery);
    mastery = {
      skills: Object.fromEntries(
        Object.entries(object(m.skills))
          .slice(0, 18)
          .map(([id, rank]) => [str(id), integer(rank, 1, 3)]),
      ),
      locks: strings(m.locks, 18),
      locked: !!m.locked,
      ...(m.core ? { core: str(m.core) } : {}),
    };
  }
  return {
    id: str(value.id),
    seed: str(value.seed),
    created: str(value.created),
    dataVersion: str(value.dataVersion),
    map: str(value.map),
    mode: str(value.mode),
    gear,
    supplies,
    locks: strings(value.locks, 8).filter((x) =>
      slots.includes(x as never),
    ) as Kit["locks"],
    locked: !!value.locked,
    checked: strings(value.checked, 300),
    notices: strings(value.notices, 100),
    settings: readSettings(value.settings),
    ...(mastery ? { mastery } : {}),
  };
}
export function emptyLibrary(): Library {
  return {
    version: 1,
    settings: structuredClone(defaults),
    presets: [],
    history: [],
    saved: [],
    challenges: [],
  };
}
export function parseBackup(text: string): Library {
  if (text.length > 8000000) throw new Error("The backup is too large.");
  const value = object(JSON.parse(text));
  if (value.version !== 1) fail();
  const result = emptyLibrary();
  result.settings = readSettings(value.settings);
  for (const key of ["saved", "history"] as const) {
    if (!Array.isArray(value[key]) || value[key].length > 200) fail();
    result[key] = value[key].map((input) => {
      const row = object(input);
      if (!Array.isArray(row.kits) || row.kits.length > 4) fail();
      return {
        id: str(row.id),
        name: str(row.name),
        date: str(row.date),
        favorite: !!row.favorite,
        kits: row.kits.map(readKit),
      };
    });
  }
  if (!Array.isArray(value.presets) || value.presets.length > 100) fail();
  result.presets = value.presets.map((input) => {
    const row = object(input);
    return {
      id: str(row.id),
      name: str(row.name),
      settings: readSettings(row.settings),
    };
  });
  if (Array.isArray(value.challenges) && value.challenges.length <= 100)
    result.challenges = value.challenges.map((input) => {
      const row = object(input);
      const rules: Library["challenges"][number]["rules"] = [];
      if (Array.isArray(row.rules) && row.rules.length <= 30)
        for (const input of row.rules) {
          const rule = object(input);
          if (
            !["win", "loss"].includes(String(rule.when)) ||
            ![
              "primaryChance",
              "secondChance",
              "budget",
              "grenades",
              "looseRounds",
            ].includes(String(rule.field)) ||
            !["set", "add"].includes(String(rule.operation))
          )
            fail();
          rules.push({
            when: rule.when as "win" | "loss",
            field: rule.field as (typeof rules)[number]["field"],
            operation: rule.operation as "set" | "add",
            value: num(rule.value, -10000000, 10000000),
          });
        }
      return {
        id: str(row.id),
        name: str(row.name),
        notes: str(row.notes, 3000),
        wins: num(row.wins),
        losses: num(row.losses),
        streak: row.streak === undefined ? 0 : integer(row.streak, 0, 100000),
        rules,
        settings: readSettings(row.settings),
      };
    });
  return result;
}
export function loadLibrary(): Library {
  let text: string | null = null;
  try {
    text = localStorage.getItem(key);
    return text ? parseBackup(text) : emptyLibrary();
  } catch {
    try {
      if (text && !localStorage.getItem(key + "-recovery"))
        localStorage.setItem(key + "-recovery", text);
    } catch {}
    return emptyLibrary();
  }
}
export function recoveryBackup() {
  try {
    return localStorage.getItem(key + "-recovery");
  } catch {
    return null;
  }
}
export function saveLibrary(library: Library) {
  const text = JSON.stringify(library);
  parseBackup(text);
  localStorage.setItem(key, text);
}
export function encodeShare(kits: Kit[], settings: Settings) {
  return compactShare(kits, settings);
}
export function decodeShare(text: string) {
  if (text.length > 200000) throw new Error("This share link is too large.");
  if (text.startsWith("2.")) {
    try {
      return parseLoadout(JSON.stringify(expandShare(text)));
    } catch {
      return fail();
    }
  }
  let decoded: string | null;
  try {
    decoded = LZString.decompressFromEncodedURIComponent(text);
  } catch {
    return fail();
  }
  if (!decoded || decoded.length > 2000000) return fail();
  return parseLoadout(decoded);
}
export function parseLoadout(text: string) {
  if (text.length > 2000000) throw new Error("This loadout file is too large.");
  const value = object(JSON.parse(text));
  if (
    value.version !== 1 ||
    !Array.isArray(value.kits) ||
    !value.kits.length ||
    value.kits.length > 4
  )
    return fail();
  return {
    kits: value.kits.map(readKit),
    settings: readSettings(value.settings),
  };
}
export function download(
  name: string,
  text: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
