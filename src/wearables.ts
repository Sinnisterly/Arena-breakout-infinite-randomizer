import snapshot from "./data/wearables.json";
import { byId } from "./catalog";
import type { Kit } from "./types";

type HelmetRule = {
  externalHeadset: boolean;
  builtInAudio: boolean;
  faceShields: string[];
  gasMasks: boolean;
  sourceName: string;
};
export const wearableRules = snapshot.helmets as Record<string, HelmetRule>;
export const wearableSources = snapshot.sources;
export function canWear(helmetId: string | undefined, itemId: string) {
  const item = byId[itemId];
  if (!item) return false;
  if (!helmetId)
    return item.category === "headset" || item.category === "gasMask";
  const rule = wearableRules[helmetId];
  if (!rule) return false;
  if (item.category === "headset") return rule.externalHeadset;
  if (item.category === "face") return rule.faceShields.includes(itemId);
  if (item.category === "gasMask") return rule.gasMasks;
  return false;
}
export function wearableErrors(kit: Kit) {
  const errors: string[] = [];
  const helmet = kit.gear.helmet?.id;
  for (const slot of ["headset", "face"] as const) {
    const item = kit.gear[slot];
    if (item && !canWear(helmet, item.id))
      errors.push(
        `No supported pairing: ${byId[item.id]?.name ?? item.id} with ${helmet ? (byId[helmet]?.name ?? helmet) : "no helmet"}. Choose a supported item or helmet.`,
      );
  }
  return errors;
}
