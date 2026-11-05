import { describe, expect, it } from "vitest";
import { priceIssues, allowedPriceRange } from "./price-rules";
import {
  defaults,
  generate,
  validate,
  generateSquad,
  squadPriceIssues,
} from "./engine";
import { decodeShare, encodeShare } from "./storage";

describe("estimated price rules", () => {
  const rule = { label: "Entry value", min: 100000, max: 900000 };
  it("allows the default margin on both sides and marks the uncertainty", () => {
    expect(allowedPriceRange(rule, defaults)).toEqual({
      min: 90000,
      max: 990000,
    });
    for (const amount of [90000, 100000, 110000, 810000, 900000, 990000]) {
      const issues = priceIssues(amount, rule, defaults);
      expect(issues.some((i) => i.severity === "error")).toBe(false);
      expect(issues.some((i) => i.code === "price-estimate")).toBe(true);
    }
    expect(priceIssues(500000, rule, defaults)).toEqual([]);
    expect(
      priceIssues(89999, rule, defaults).some((i) => i.severity === "error"),
    ).toBe(true);
    expect(
      priceIssues(990001, rule, defaults).some((i) => i.severity === "error"),
    ).toBe(true);
  });
  it("supports strict and informational modes without loosening tier checks", () => {
    expect(
      priceIssues(95000, rule, { ...defaults, priceRules: "strict" }).some(
        (i) => i.severity === "error",
      ),
    ).toBe(true);
    expect(
      priceIssues(2000000, rule, {
        ...defaults,
        priceRules: "informational",
      }).some((i) => i.severity === "error"),
    ).toBe(false);
    const kit = generate("firm-tiers", {
      ...defaults,
      maps: ["farm"],
      modes: ["normal"],
      priceRules: "informational",
    });
    kit.gear.armor = { id: "301010201", quantity: 1, children: [] };
    expect(
      validate(kit).some(
        (i) => i.severity === "error" && i.text.includes("tier limit"),
      ),
    ).toBe(true);
  });
  it("honors the chosen percentage and preserves it in exact shares", () => {
    const config = {
      ...defaults,
      priceMargin: 20,
      priceRules: "margin" as const,
    };
    expect(allowedPriceRange(rule, config)).toEqual({
      min: 80000,
      max: 1080000,
    });
    const kit = generate("margin-share", config);
    expect(
      decodeShare(encodeShare([kit], config)).kits[0].settings.priceMargin,
    ).toBe(20);
  });
  it("applies informational mode to squad caps and preserves structural failures", () => {
    const config = {
      ...defaults,
      priceRules: "informational" as const,
      squadBudget: 1,
    };
    const kits = generateSquad("informational-squad", [config, config]);
    expect(
      squadPriceIssues(kits, config).every((i) => i.severity === "notice"),
    ).toBe(true);
    expect(squadPriceIssues(kits, config).length).toBeGreaterThan(0);
    kits[0].supplies[0].container = "missing";
    expect(
      validate(kits[0]).some(
        (i) => i.severity === "error" && i.text.includes("not packed"),
      ),
    ).toBe(true);
  });
});
