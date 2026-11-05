import { describe, expect, it } from "vitest";
import { weaponPlans } from "./catalog";
import { assembleWeapon, assemblyErrors } from "./weapon-assembly";
import { defaults, random, generate, rerollPart, validate } from "./engine";
import { decodeShare, encodeShare } from "./storage";

const plan = weaponPlans.find((p) => p.id === "101010001")!;
const config = {
  ...defaults,
  maps: ["farm"],
  modes: ["normal"],
  secondChance: 0,
  attachmentDensity: "bare" as const,
  categories: { ...defaults.categories, gun: false },
  fixed: { gun: "101010001" },
};
describe("weapon dependencies", () => {
  it("adds a stock adapter and removes it when returning to the wooden stock", () => {
    const before = rerollPart(
      generate("stock-base", config),
      "gun",
      "Stock",
      "wood-start",
      "201040146",
    );
    const next = rerollPart(before, "gun", "Stock", "pt-stock", "201040101");
    expect(next.gear.gun!.children.some((c) => c.id === "201040306")).toBe(
      true,
    );
    expect(next.gear.gun!.children.some((c) => c.id === "201040146")).toBe(
      false,
    );
    expect(next.notices.join(" ")).toContain("Supporting parts changed");
    expect(next.supplies).toEqual(before.supplies);
    expect(next.gear.armor).toEqual(before.gear.armor);
    expect(before.gear.gun!.children.some((c) => c.id === "201040306")).toBe(
      false,
    );
    const wood = rerollPart(next, "gun", "Stock", "wood", "201040146");
    expect(wood.gear.gun!.children.some((c) => c.id === "201040306")).toBe(
      false,
    );
    expect(validate(wood).filter((i) => i.severity === "error")).toEqual([]);
  });
  it("adds the sight rail and rejects a missing rail in imported assemblies", () => {
    const kit = generate("sight-base", config);
    const next = rerollPart(kit, "gun", "Optic", "optic", "201030108");
    expect(next.gear.gun!.children.some((c) => c.id === "201060115")).toBe(
      true,
    );
    next.gear.gun!.children = next.gear.gun!.children.filter(
      (c) => c.id !== "201060115",
    );
    expect(
      validate(next).some(
        (i) =>
          i.severity === "error" &&
          i.text.includes("needs AK Series Dust Cover Rail"),
      ),
    ).toBe(true);
  });
  it("preserves locked supporting parts and explains manual-mode conflicts without mutation", () => {
    const kit = rerollPart(
      generate("locked-base", config),
      "gun",
      "Stock",
      "wood-base",
      "201040146",
    );
    const before = structuredClone(kit);
    kit.gear.gun!.partLocks = ["201040146"];
    expect(() =>
      rerollPart(kit, "gun", "Stock adapter", "locked", "201040306"),
    ).toThrow(/No working assembly/);
    kit.gear.gun!.partLocks = [];
    kit.settings.supportingParts = "manual";
    expect(() =>
      rerollPart(kit, "gun", "Stock", "manual", "201040101"),
    ).toThrow(/Stock adapter/);
    expect(kit.gear.gun!.children).toEqual(before.gear.gun!.children);
  });
  it("honors exclusions, zero weights, and impossible requirements", () => {
    for (const settings of [
      { ...defaults, excluded: ["201040306"] },
      { ...defaults, weights: { "201040306": 0 } },
    ]) {
      expect(() =>
        assembleWeapon(plan, {
          settings,
          rng: random("blocked"),
          target: { slot: "Stock", id: "201040101" },
        }),
      ).toThrow(/No working assembly/);
    }
    expect(() =>
      assembleWeapon(plan, {
        settings: defaults,
        rng: random("unknown"),
        target: { slot: "Optic", id: "201040101" },
      }),
    ).toThrow(/does not fit/);
  });
  it("skips guns whose required parts are excluded instead of failing a valid pool", () => {
    for (let i = 0; i < 30; i++) {
      const kit = generate(`filtered-gun:${i}`, {
        ...defaults,
        maps: ["farm"],
        modes: ["normal"],
        primaryChance: 100,
        secondChance: 0,
        excluded: ["201140002"],
      });
      expect(kit.gear.gun!.id).not.toBe("101010001");
      expect(
        validate(kit).filter((issue) => issue.severity === "error"),
      ).toEqual([]);
    }
  });
  it("keeps exact assembly and repair policy through shared links", () => {
    const kit = rerollPart(
      generate("share-assembly", config),
      "gun",
      "Optic",
      "optic-share",
      "201030108",
    );
    kit.settings.supportingParts = "manual";
    expect(decodeShare(encodeShare([kit], kit.settings)).kits[0]).toEqual(kit);
  });
  it("generates consistent working assemblies across seeds, densities, and locked dependencies", () => {
    for (const density of ["bare", "mixed", "full"] as const) {
      for (let i = 0; i < 100; i++) {
        const options = {
          settings: { ...defaults, attachmentDensity: density },
          rng: random(`${density}:${i}`),
        };
        const ids = assembleWeapon(plan, options);
        expect(assemblyErrors(plan, ids)).toEqual([]);
        expect(ids).toEqual(
          assembleWeapon(plan, { ...options, rng: random(`${density}:${i}`) }),
        );
        const locked = assembleWeapon(plan, {
          ...options,
          rng: random(`lock:${i}`),
          locked: ["201040101"],
        });
        expect(locked).toContain("201040306");
        expect(assemblyErrors(plan, locked)).toEqual([]);
      }
    }
  });
});
