import { byId, money } from "./catalog";
import type { Equipment, Supply } from "./types";

export const estimatedPrice = (amount: number) => `~${money(amount)}`;
export function itemLabel(id: string) {
  const item = byId[id];
  if (!item) return id;
  return item.kind === "ammo"
    ? `${item.name} (T${item.tier ?? "?"})`
    : item.name;
}
export function itemEstimate(item: Equipment | Supply): number {
  return (
    (byId[item.id]?.price ?? 0) * item.quantity +
    (item.ammoId && item.rounds
      ? (byId[item.ammoId]?.price ?? 0) * item.rounds
      : 0) +
    ("children" in item
      ? item.children.reduce((sum, child) => sum + itemEstimate(child), 0)
      : 0)
  );
}
export function itemPrice(item: Equipment | Supply): string {
  const unpriced = (node: Equipment | Supply): boolean =>
    byId[node.id]?.priceKnown === false ||
    (!!node.ammoId && byId[node.ammoId]?.priceKnown === false) ||
    ("children" in node && node.children.some(unpriced));
  const value = itemEstimate(item);
  return unpriced(item)
    ? value > 0
      ? `${estimatedPrice(value)} + unpriced items`
      : "Price unavailable"
    : estimatedPrice(value);
}
