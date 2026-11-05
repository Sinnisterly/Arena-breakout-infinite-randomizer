import { deflateSync, Inflate, strFromU8, strToU8 } from "fflate";
import { slots, type Equipment, type Kit, type Settings } from "./types";

// Keep this field order stable so older version 2 links retain their meaning.
const fields: (keyof Settings)[] = [
  "primaryChance",
  "secondChance",
  "sidearmOnly",
  "attachmentDensity",
  "looseRounds",
  "magazines",
  "ammoMode",
  "storeGunMag",
  "grenades",
  "food",
  "drinks",
  "extraMeds",
  "budget",
  "minBudget",
  "squadBudget",
  "medical",
  "ammo",
  "mastery",
  "allowCore",
  "masteryPoints",
  "masteryExcluded",
  "masteryWeights",
  "coreUnlocked",
  "categories",
  "fixed",
  "excluded",
  "weights",
  "maps",
  "modes",
  "mapWeights",
  "modeWeights",
  "sound",
  "volume",
  "reducedMotion",
  "reveal",
  "theme",
  "saveFixed",
  "avoidRepeats",
  "repeatFallback",
  "secureAmmo",
  "packing",
  "priceRules",
  "priceMargin",
  "supportingParts",
  "randomizeAttachments",
];
type Tuple = unknown[];
function tuple(value: unknown, max = 200): Tuple {
  if (!Array.isArray(value) || value.length > max)
    throw new Error("Invalid compact loadout.");
  return value;
}
export function compactShare(kits: Kit[], settings: Settings) {
  const ids: string[] = [],
    configs: unknown[][] = [];
  const id = (value: string) => {
    let index = ids.indexOf(value);
    if (index < 0) {
      index = ids.length;
      ids.push(value);
    }
    return index;
  };
  const config = (value: Settings) => {
    const packed = fields.map((key) => value[key]);
    let index = configs.findIndex(
      (c) => JSON.stringify(c) === JSON.stringify(packed),
    );
    if (index < 0) {
      index = configs.length;
      configs.push(packed);
    }
    return index;
  };
  function node(value: Equipment): Tuple {
    const result: Tuple = [id(value.id), value.children.map(node)];
    const extra: Record<string, unknown> = {};
    if (value.quantity !== 1) extra.q = value.quantity;
    if (value.ammoId !== undefined) {
      extra.a = id(value.ammoId);
      extra.r = value.rounds;
    }
    if (value.partLocks) extra.p = value.partLocks.map(id);
    if (Object.keys(extra).length) result.push(extra);
    return result;
  }
  const packed = kits.map((k) => [
    k.id,
    k.seed,
    k.created,
    k.dataVersion,
    k.map,
    k.mode,
    slots.map((slot) => (k.gear[slot] ? node(k.gear[slot]!) : null)),
    k.supplies.map((s) => [
      s.uid,
      id(s.id),
      s.quantity,
      s.size,
      s.role ?? null,
      s.gun ?? null,
      s.container ?? null,
      s.x ?? null,
      s.y ?? null,
      s.rotated ?? null,
      s.ammoId === undefined ? null : id(s.ammoId),
      s.rounds ?? null,
    ]),
    k.locks.map((slot) => slots.indexOf(slot)),
    k.locked,
    k.checked,
    k.notices,
    config(k.settings),
    k.mastery ?? null,
  ]);
  const text = JSON.stringify({
    v: 2,
    i: ids,
    c: configs,
    k: packed,
    s: config(settings),
  });
  if (text.length > 2000000)
    throw new Error("This shared loadout is too large. Export a file instead.");
  const bytes = deflateSync(strToU8(text), { level: 9 });
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return (
    "2." +
    btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")
  );
}
export function expandShare(text: string): unknown {
  const encoded = text.slice(2);
  if (!/^[A-Za-z0-9_-]+$/.test(encoded))
    throw new Error("Invalid compact loadout.");
  const binary = atob(encoded.replaceAll("-", "+").replaceAll("_", "/"));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const chunks: Uint8Array[] = [];
  let length = 0;
  const decoder = new Inflate((chunk) => {
    length += chunk.length;
    if (length > 2000000)
      throw new Error("This shared loadout expands beyond its size limit.");
    chunks.push(chunk);
  });
  for (let start = 0; start < bytes.length; start += 512)
    decoder.push(
      bytes.subarray(start, start + 512),
      start + 512 >= bytes.length,
    );
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  const value = JSON.parse(strFromU8(output));
  if (value.v !== 2) throw new Error("Unsupported share version.");
  const ids = tuple(value.i, 3000),
    configs = tuple(value.c, 5),
    kits = tuple(value.k, 4);
  const id = (index: unknown) =>
    typeof index === "number" &&
    Number.isInteger(index) &&
    typeof ids[index] === "string"
      ? ids[index]
      : undefined;
  const config = (index: unknown) => {
    if (typeof index !== "number") throw new Error("Invalid shared settings.");
    const values = tuple(configs[index], fields.length);
    return Object.fromEntries(
      fields
        .map((field, i) => [field, values[i]])
        .filter(([, v]) => v !== undefined),
    );
  };
  function node(input: unknown, depth = 0): unknown {
    if (depth > 5) throw new Error("Invalid attachment depth.");
    const n = tuple(input, 3),
      extra = n[2] as Record<string, unknown> | undefined;
    return {
      id: id(n[0]),
      children: tuple(n[1], 40).map((child) => node(child, depth + 1)),
      quantity: extra?.q ?? 1,
      ...(extra && "a" in extra
        ? { ammoId: id(extra.a), rounds: extra.r }
        : {}),
      ...(extra?.p ? { partLocks: tuple(extra.p, 40).map(id) } : {}),
    };
  }
  return {
    version: 1,
    settings: config(value.s),
    kits: kits.map((input) => {
      const k = tuple(input, 14),
        gear = tuple(k[6], slots.length);
      return {
        id: k[0],
        seed: k[1],
        created: k[2],
        dataVersion: k[3],
        map: k[4],
        mode: k[5],
        gear: Object.fromEntries(
          slots.flatMap((slot, i) =>
            gear[i] === null ? [] : [[slot, node(gear[i])]],
          ),
        ),
        supplies: tuple(k[7], 150).map((input) => {
          const s = tuple(input, 12);
          return {
            uid: s[0],
            id: id(s[1]),
            quantity: s[2],
            size: s[3],
            ...(s[4] !== null ? { role: s[4] } : {}),
            ...(s[5] !== null ? { gun: s[5] } : {}),
            ...(s[6] !== null
              ? { container: s[6], x: s[7], y: s[8], rotated: s[9] }
              : {}),
            ...(s[10] !== null ? { ammoId: id(s[10]), rounds: s[11] } : {}),
          };
        }),
        locks: tuple(k[8], 8).map((i) => slots[i as number]),
        locked: k[9],
        checked: k[10],
        notices: k[11],
        settings: config(k[12]),
        ...(k[13] ? { mastery: k[13] } : {}),
      };
    }),
  };
}
