import { describe, expect, it } from "vitest";
import LZString from "lz-string";
import {
  defaults,
  generate,
  pack,
  totals,
  validate,
  random,
  choose,
  moveSupply,
  rerollPart,
  preserveChecks,
  compartments,
  generatePlayer,
  generateSquad,
} from "./engine";
import { decodeShare, encodeShare, parseBackup } from "./storage";
import { catalog, byId } from "./catalog";

describe("random choices", () => {
  it("repeats a seed and respects zero weights", () => {
    const a = random("raid"),
      b = random("raid");
    expect(Array.from({ length: 20 }, () => a())).toEqual(
      Array.from({ length: 20 }, () => b()),
    );
    expect(choose(["a", "b"], random("x"), { a: 0, b: 1 })).toBe("b");
    expect(() => choose(["a"], random("x"), { a: 0 })).toThrow();
  });
});
describe("inventory", () => {
  it("does not fit a square magazine across separate pouches", () => {
    expect(
      pack(
        [{ uid: "mag", id: "x", quantity: 1, size: [2, 2] }],
        [
          { id: "rig", size: [1, 2] },
          { id: "rig2", size: [1, 2] },
        ],
      ),
    ).toBeNull();
  });
  it("rotates long items and never overlaps occupied cells", () => {
    const result = pack(
      [
        { uid: "med", id: "x", quantity: 1, size: [2, 1] },
        { uid: "ammo", id: "y", quantity: 60, size: [1, 1] },
      ],
      [{ id: "bag", size: [1, 3] }],
    );
    expect(result?.find((x) => x.uid === "med")?.rotated).toBe(true);
    expect(new Set(result?.map((x) => x.y)).size).toBe(2);
  });
});
describe("loadouts", () => {
  it("generates repeatable kits with treatment and generous ammunition", () => {
    const kit = generate("first", defaults);
    expect(kit).toEqual(generate("first", defaults));
    expect(kit.supplies.some((x) => byId[x.id].category === "surgery")).toBe(
      true,
    );
    expect(kit.supplies.some((x) => byId[x.id].category === "healing")).toBe(
      true,
    );
    expect(kit.supplies.some((x) => byId[x.id].category === "bandage")).toBe(
      true,
    );
    expect(
      kit.supplies
        .filter((x) => x.role === "reserve")
        .reduce((a, x) => a + x.quantity, 0),
    ).toBeGreaterThanOrEqual(120);
    expect(validate(kit).filter((x) => x.severity === "error")).toEqual([]);
  });
  it("retains locked equipment across new rolls", () => {
    const old = generate("one", defaults);
    old.locks = ["gun", "armor"];
    const next = generate("two", defaults, old);
    expect(next.gear.gun).toEqual(old.gear.gun);
    expect(next.gear.armor).toEqual(old.gear.armor);
  });
  it("uses legal ammo and packing across many seeds", () => {
    for (let i = 0; i < 80; i++) {
      const kit = generate(String(i), defaults);
      expect(
        validate(kit).filter((x) => x.severity === "error"),
        String(i),
      ).toEqual([]);
      expect(
        kit.supplies
          .filter((x) => byId[x.id].category === "ammo")
          .every((x) => x.quantity <= 60),
      ).toBe(true);
    }
  });
  it("rejects impossible filters without changing fixed items", () => {
    expect(() =>
      generate("empty", {
        ...defaults,
        excluded: catalog.filter((x) => x.kind === "weapon").map((x) => x.id),
      }),
    ).toThrow(/weapon|gun/i);
  });
  it("excludes stored magazines and consumables from entry value", () => {
    const kit = generate("cost", defaults);
    const original = totals(kit);
    const mag = kit.supplies.find((x) => x.role === "gun-mag")!;
    const loaded = structuredClone(kit);
    loaded.supplies = loaded.supplies.filter((x) => x.uid !== mag.uid);
    loaded.gear.gun!.children.push({ ...mag, children: [] });
    expect(totals(loaded).entry - original.entry).toBe(byId[mag.id].price);
    expect(totals(loaded).purchase).toBe(original.purchase);
  });
  it("rejects occupied or out-of-bounds manual moves", () => {
    const kit = generate("move", defaults);
    const first = kit.supplies[0];
    expect(() => moveSupply(kit, first.uid, "missing", 0, 0, false)).toThrow();
    expect(kit.supplies[0]).toEqual(first);
  });
  it("preserves a fixed rig instead of rolling conflicting armor", () => {
    const settings = {
      ...defaults,
      categories: { ...defaults.categories, rig: false },
      fixed: { rig: "301010101" },
    };
    for (let i = 0; i < 30; i++) {
      const kit = generate("fixed" + i, settings);
      expect(kit.gear.rig?.id).toBe("301010101");
      expect(byId[kit.gear.armor!.id].category).toBe("armor");
    }
  });
  it("rejects wrong equipment slots and unrelated weapon children", () => {
    const kit = generate("invalid-slot", defaults);
    kit.gear.helmet = structuredClone(kit.gear.gun);
    expect(validate(kit).some((i) => i.severity === "error")).toBe(true);
    const other = generate("invalid-child", defaults);
    other.gear.gun!.children.push(structuredClone(other.gear.armor!));
    expect(validate(other).some((i) => i.severity === "error")).toBe(true);
  });
  it("rejects forged supply dimensions", () => {
    const kit = generate("dimensions", defaults);
    kit.supplies[0].size = [1, 1];
    const item = kit.supplies.find(
      (s) => byId[s.id].size[0] * byId[s.id].size[1] > 1,
    );
    if (item) {
      item.size = [1, 1];
      expect(validate(kit).some((i) => i.text.includes("footprint"))).toBe(
        true,
      );
    }
  });
  it("allocates mastery within the legal point, skill, and rank limits", () => {
    const kit = generate("mastery", { ...defaults, mastery: true });
    expect(Object.values(kit.mastery!.skills).reduce((a, b) => a + b, 0)).toBe(
      12,
    );
    expect(Object.keys(kit.mastery!.skills).length).toBeLessThanOrEqual(6);
    expect(
      Object.values(kit.mastery!.skills).every((n) => n >= 1 && n <= 3),
    ).toBe(true);
    expect(kit.mastery!.core).toBeUndefined();
  });
  it("keeps attachment locks and rerolls a part without changing other gear", () => {
    const settings = {
      ...defaults,
      sidearmOnly: true,
      categories: { ...defaults.categories, gun: false },
      fixed: { gun: "102010001" },
    };
    const kit = generate("parts", settings);
    const plan = kit.gear.gun!.id === "102010001" ? "Slide" : "Grip";
    const next = rerollPart(kit, "gun", plan, "part-change");
    expect(next.gear.armor).toEqual(kit.gear.armor);
    expect(next.supplies).toEqual(kit.supplies);
    const part = next.gear.gun!.children[0].id;
    next.gear.gun!.partLocks = [part];
    expect(
      generate("locked-parts", settings, next).gear.gun!.children.some(
        (c) => c.id === part,
      ),
    ).toBe(true);
  });
  it("adds only the explicitly unlocked core and its pockets", () => {
    const kit = generate("core", {
      ...defaults,
      mastery: true,
      allowCore: true,
      coreUnlocked: ["tactical-belt"],
    });
    expect(kit.mastery!.core).toBe("tactical-belt");
    expect(
      compartments(kit).filter((c) => c.id.startsWith("pocket")).length,
    ).toBe(8);
    expect(decodeShare(encodeShare([kit], kit.settings)).kits[0]).toEqual(kit);
  });
  it("retains checks for unchanged gear and clears changed magazine contents", () => {
    const kit = generate("checklist", defaults);
    kit.checked = ["armor", kit.supplies[0].uid];
    const next = structuredClone(kit);
    next.supplies[0].rounds = 1;
    expect(preserveChecks(kit, next)).toEqual(["armor"]);
  });
  it("gives every squad member the same destination and preserves locked players", () => {
    const original = generate("squad-lock", defaults);
    original.locked = true;
    const squad = generateSquad(
      "shared-map",
      [defaults, defaults, defaults],
      [original, null, null],
    );
    expect(squad[0]).toEqual(original);
    expect(new Set(squad.map((k) => k.map + ":" + k.mode)).size).toBe(1);
  });
  it("rejects a squad cap below the combined entry floor", () => {
    const settings = {
      ...defaults,
      maps: ["armory"],
      modes: ["forbidden"],
      squadBudget: 500000,
    };
    expect(() => generateSquad("cap", [settings, settings])).toThrow(
      /spending cap/,
    );
  });
  it("counts existing player purchases against an individual reroll", () => {
    const old = generate("expensive", defaults);
    expect(() =>
      generatePlayer("cannot-fit", { ...defaults, squadBudget: 1 }, [old]),
    ).toThrow(/spending cap/);
  });
});
describe("portable library", () => {
  it("uses a shorter exact format and continues to open existing links", () => {
    const kits = generateSquad("compact-links", [
      defaults,
      defaults,
      defaults,
      defaults,
    ]);
    const legacy = LZString.compressToEncodedURIComponent(
      JSON.stringify({ version: 1, kits, settings: defaults }),
    );
    const compact = encodeShare(kits, defaults);
    expect(compact.length).toBeLessThan(legacy.length * 0.7);
    expect(decodeShare(compact).kits).toEqual(kits);
    expect(decodeShare(legacy).kits).toEqual(kits);
  });
  it("preserves the exact result through share encoding", () => {
    const squad = [generate("share", defaults)];
    expect(decodeShare(encodeShare(squad, defaults))?.kits).toEqual(squad);
  });
  it("rejects malformed and unbounded imports", () => {
    expect(() => decodeShare("broken")).toThrow();
    expect(() => parseBackup('{"version":900,"history":[]}')).toThrow();
    expect(() => decodeShare("x".repeat(200001))).toThrow();
  });
});
