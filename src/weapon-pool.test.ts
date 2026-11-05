import { describe, expect, it } from "vitest";
import {
  weaponPlans,
  allWeaponPlans,
  byId,
  catalog,
  isSidearm,
} from "./catalog";
import { defaults, generate, validate, totals } from "./engine";
import { decodeShare, encodeShare, readSettings } from "./storage";
import { assemblyErrors, assembleWeapon } from "./weapon-assembly";
import { random } from "./engine";

describe("expanded weapon pool", () => {
  it("resolves bare and full candidate builds while excluding known cross-platform parts", () => {
    for (const plan of weaponPlans)
      for (const attachmentDensity of ["bare", "full"] as const) {
        const ids = assembleWeapon(plan, {
          settings: { ...defaults, attachmentDensity },
          rng: random(`density:${plan.id}:${attachmentDensity}`),
        });
        expect(
          assemblyErrors(plan, ids),
          `${plan.id}:${attachmentDensity}`,
        ).toEqual([]);
      }
    expect(
      weaponPlans
        .find((p) => p.id === "101010002")!
        .parts.flatMap((p) => p.ids),
    ).not.toContain("201110004");
    expect(
      weaponPlans
        .find((p) => p.id === "101030004")!
        .parts.flatMap((p) => p.ids),
    ).not.toContain("201040510");
  });
  it("excludes the signal gun and three weapons with unconfirmed availability", () => {
    const combat = catalog.filter(
      (item) =>
        item.kind === "weapon" &&
        !["102010014", "101030005", "101040002", "101040003"].includes(item.id),
    );
    expect(weaponPlans.map((p) => p.id).sort()).toEqual(
      combat.map((i) => i.id).sort(),
    );
    expect(combat.length).toBe(82);
    expect(
      allWeaponPlans
        .filter((p) => p.availability)
        .map((p) => p.id)
        .sort(),
    ).toEqual(["101030005", "101040002", "101040003"]);
    expect(isSidearm("192010002")).toBe(true);
    expect(
      weaponPlans.filter((p) => p.verification === "best-guess").length,
    ).toBe(78);
  });
  for (const randomizeAttachments of [true, false]) {
    it(`generates every firearm with attachment randomization ${randomizeAttachments ? "on" : "off"}`, () => {
      for (const plan of weaponPlans) {
        const minTier = Math.min(
          ...catalog
            .filter(
              (i) => i.kind === "ammo" && i.ammoTag === byId[plan.id].ammoTag,
            )
            .map((i) => i.tier ?? 99),
        );
        const settings = {
          ...defaults,
          maps: [minTier > 5 ? "armory" : "farm"],
          modes: [
            minTier > 5 ? "forbidden" : minTier > 4 ? "lockdown" : "normal",
          ],
          secondChance: 0,
          randomizeAttachments,
          priceRules: "informational" as const,
          categories: { ...defaults.categories, gun: false },
          fixed: { gun: plan.id },
        };
        let kit;
        try {
          kit = generate(`pool:${plan.id}:${randomizeAttachments}`, settings);
        } catch (error) {
          throw new Error(`${byId[plan.id].name}: ${(error as Error).message}`);
        }
        expect(kit.gear.gun!.id, byId[plan.id].name).toBe(plan.id);
        expect(
          validate(kit).filter((i) => i.severity === "error"),
          byId[plan.id].name,
        ).toEqual([]);
        expect(
          validate(kit).some((i) => i.code === "attachment-estimate"),
        ).toBe(true);
        expect(
          assemblyErrors(
            plan,
            kit.gear
              .gun!.children.filter((c) => !plan.magazines.includes(c.id))
              .map((c) => c.id),
          ),
        ).toEqual([]);
        expect(
          kit.supplies
            .filter((s) => s.role === "reserve")
            .reduce((n, s) => n + s.quantity, 0),
        ).toBe(120);
        expect(Number.isFinite(totals(kit).purchase)).toBe(true);
        if (plan.internalCapacity) {
          expect(kit.gear.gun!.rounds).toBe(plan.internalCapacity);
          expect(byId[kit.gear.gun!.ammoId!].ammoTag).toBe(
            byId[plan.id].ammoTag,
          );
          expect(
            kit.supplies.filter(
              (s) => s.role === "gun-mag" || s.role === "spare-mag",
            ),
          ).toEqual([]);
        }
        if (!randomizeAttachments) {
          const next = generate(`different:${plan.id}`, settings);
          expect(next.gear.gun!.children.map((c) => c.id)).toEqual(
            kit.gear.gun!.children.map((c) => c.id),
          );
          expect(
            next.supplies.filter((s) => s.role === "gun-mag").map((s) => s.id),
          ).toEqual(
            kit.supplies.filter((s) => s.role === "gun-mag").map((s) => s.id),
          );
        }
      }
    });
  }
  it("keeps direct-loaded guns and the attachment setting through exact shares", () => {
    const settings = {
      ...defaults,
      maps: ["farm"],
      modes: ["normal"],
      secondChance: 0,
      randomizeAttachments: false,
      categories: { ...defaults.categories, gun: false },
      fixed: { gun: "192010002" },
    };
    const kit = generate("revolver-share", settings);
    expect(decodeShare(encodeShare([kit], settings)).kits[0]).toEqual(kit);
    const { randomizeAttachments: omitted, ...legacy } = settings;
    expect(omitted).toBe(false);
    expect(readSettings(legacy).randomizeAttachments).toBe(true);
  });
  it("rejects wrong caliber and capacity even for best-guess attachment builds", () => {
    const settings = {
      ...defaults,
      maps: ["farm"],
      modes: ["normal"],
      secondChance: 0,
      categories: { ...defaults.categories, gun: false },
      fixed: { gun: "192010002" },
    };
    const kit = generate("revolver-errors", settings);
    kit.gear.gun!.rounds = 7;
    kit.gear.gun!.ammoId = catalog.find(
      (i) => i.kind === "ammo" && i.ammoTag === "Ammo.556x45mm",
    )!.id;
    expect(
      validate(kit).some(
        (i) => i.severity === "error" && i.text.includes("over capacity"),
      ),
    ).toBe(true);
    expect(
      validate(kit).some(
        (i) =>
          i.severity === "error" && i.text.includes("incompatible ammunition"),
      ),
    ).toBe(true);
  });
  it("does not bypass an ammo tier cap to include a best-guess weapon", () => {
    expect(() =>
      generate("ax50-normal", {
        ...defaults,
        maps: ["farm"],
        modes: ["normal"],
        secondChance: 0,
        categories: { ...defaults.categories, gun: false },
        fixed: { gun: "101040002" },
      }),
    ).toThrow(/No working gun/);
  });
});
