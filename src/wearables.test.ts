import { describe, expect, it } from "vitest";
import { canWear, wearableRules } from "./wearables";
import { byId, catalog, maps } from "./catalog";
import { defaults, generate, generateSquad, totals, validate } from "./engine";
const id = (name: string) => catalog.find((item) => item.name === name)!.id;
describe("wearable rules", () => {
  it("accepts the sourced face-shield pairings and rejects unrelated helmets", () => {
    for (const [helmet, rule] of Object.entries(wearableRules))
      for (const shield of rule.faceShields)
        expect(canWear(helmet, shield)).toBe(true);
    expect(canWear(id("6BNT Helmet"), id("DK6 Security Ballistic Mask"))).toBe(
      false,
    );
    expect(canWear(undefined, id("DK6 Security Ballistic Mask"))).toBe(false);
  });
  it("distinguishes built-in audio, external headsets, and closed helmet coverage", () => {
    const headset = id("Com1 Tactical Headset");
    expect(canWear(id("F70 Tactical Helmet"), headset)).toBe(true);
    for (const helmet of [
      "56K Helicopter Helmet",
      "AN95 Heavy Blast Helmet",
      "SH12 Military Helmet",
      "6BNT Helmet",
    ])
      expect(canWear(id(helmet), headset)).toBe(false);
    expect(canWear(undefined, headset)).toBe(true);
    expect(canWear(id("F70 Tactical Helmet"), id("RAL Full Gas Mask"))).toBe(
      true,
    );
    expect(canWear(id("56K Helicopter Helmet"), id("RAL Full Gas Mask"))).toBe(
      false,
    );
  });
  it("chooses a supporting helmet for fixed face protection and preserves it across rolls", () => {
    const mask = id("DK7 Premium Bulletproof Mask");
    const settings = {
      ...defaults,
      maps: ["armory"],
      modes: ["forbidden"],
      priceRules: "informational" as const,
      categories: { ...defaults.categories, face: false },
      fixed: { face: mask },
    };
    const kit = generate("fixed-mask", settings);
    expect(kit.gear.helmet?.id).toBe(id("AS200 Heavy Tactical Helmet"));
    kit.locks = ["face"];
    const next = generate("locked-mask", settings, kit);
    expect(next.gear.face).toEqual(kit.gear.face);
    expect(canWear(next.gear.helmet?.id, mask)).toBe(true);
    expect(validate(next).filter((i) => i.severity === "error")).toEqual([]);
  });
  it("does not add an external headset to a helmet with built-in audio", () => {
    const settings = {
      ...defaults,
      maps: ["farm"],
      modes: ["lockdown"],
      categories: { ...defaults.categories, helmet: false },
      fixed: { helmet: id("AN95 Heavy Blast Helmet") },
    };
    const kit = generate("builtin-audio", settings);
    expect(kit.gear.headset).toBeUndefined();
    expect(kit.notices.some((text) => text.includes("built-in audio"))).toBe(
      true,
    );
  });
  it("rolls compatible wearable combinations and keeps the Normal ceiling", () => {
    let headsets = 0,
      faces = 0;
    for (let n = 0; n < 80; n++) {
      const kit = generate(`wearables:${n}`, {
        ...defaults,
        maps: ["farm"],
        modes: ["normal"],
        priceRules: "strict",
      });
      expect(totals(kit).entry).toBeLessThanOrEqual(300000);
      expect(validate(kit).filter((i) => i.severity === "error")).toEqual([]);
      if (kit.gear.headset) {
        headsets++;
        expect(canWear(kit.gear.helmet?.id, kit.gear.headset.id)).toBe(true);
      }
      if (kit.gear.face) {
        faces++;
        expect(canWear(kit.gear.helmet?.id, kit.gear.face.id)).toBe(true);
      }
    }
    expect(headsets).toBeGreaterThan(0);
    expect(faces).toBeGreaterThan(0);
  });
  it("rejects manual or imported wearable mismatches", () => {
    const kit = generate("bad-visor", defaults);
    kit.gear.helmet = { id: id("6BNT Helmet"), quantity: 1, children: [] };
    kit.gear.face = {
      id: id("DK6 Security Ballistic Mask"),
      quantity: 1,
      children: [],
    };
    expect(
      validate(kit).some(
        (i) =>
          i.severity === "error" && i.text.includes("No supported pairing"),
      ),
    ).toBe(true);
  });
});
describe("Tactical Ops availability", () => {
  it("keeps infected replacements outside the standard map pool", () => {
    expect(maps.find((m) => m.id === "farm")!.modes).not.toContain("forbidden");
    expect(maps.find((m) => m.id === "valley")!.modes).not.toContain(
      "lockdown",
    );
    expect(maps.find((m) => m.id === "airport")!.modes).not.toContain(
      "forbidden",
    );
    expect(() =>
      generate("invalid-map", {
        ...defaults,
        maps: ["valley"],
        modes: ["lockdown"],
      }),
    ).toThrow(/No map and mode/);
    const squad = generateSquad("wearable-squad", [
      defaults,
      defaults,
      defaults,
      defaults,
    ]);
    expect(new Set(squad.map((k) => k.map + ":" + k.mode)).size).toBe(1);
    expect(
      squad.flatMap(validate).filter((i) => i.severity === "error"),
    ).toEqual([]);
  });
});
