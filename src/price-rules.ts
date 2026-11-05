import type { Issue, Settings } from "./types";
import { money } from "./catalog";
import { estimatedPrice } from "./presentation";

type PriceSettings = Pick<Settings, "priceRules" | "priceMargin">;
export type PriceRange = { label: string; min?: number; max?: number };
export function allowedPriceRange(
  range: Omit<PriceRange, "label">,
  settings: PriceSettings,
) {
  if (settings.priceRules === "informational") return { min: 0, max: Infinity };
  const margin = settings.priceRules === "margin" ? settings.priceMargin : 0;
  const min = range.min ?? 0,
    max = range.max ?? Infinity;
  return {
    min: Math.max(0, Math.ceil((min * (100 - margin)) / 100)),
    max: Number.isFinite(max)
      ? Math.floor((max * (100 + margin)) / 100)
      : Infinity,
  };
}
export function priceIssues(
  amount: number,
  range: PriceRange,
  settings: PriceSettings,
): Issue[] {
  const allowed = allowedPriceRange(range, settings),
    issues: Issue[] = [];
  for (const [direction, limit] of [
    ["minimum", range.min ?? 0],
    ["maximum", range.max ?? Infinity],
  ] as const) {
    if (limit <= 0 || !Number.isFinite(limit)) continue;
    const below = direction === "minimum",
      outside = below ? amount < limit : amount > limit;
    const near =
      Math.abs(amount - limit) <= (limit * settings.priceMargin) / 100;
    if (!outside && !near) continue;
    const blocked = amount < allowed.min || amount > allowed.max;
    const position = outside ? (below ? "below" : "above") : "near";
    const handling = blocked
      ? "Outside your selected price rules."
      : outside && settings.priceRules === "margin"
        ? `Within your ${settings.priceMargin}% margin.`
        : settings.priceRules === "informational"
          ? "Price limits are informational."
          : "";
    issues.push({
      severity: blocked ? "error" : "notice",
      code: "price-estimate",
      text: `${range.label} ${estimatedPrice(amount)} is ${position} the ${money(limit)} Koen ${direction}. ${handling} Check current prices in game.`.replace(
        /\s+/g,
        " ",
      ),
    });
  }
  return issues;
}
