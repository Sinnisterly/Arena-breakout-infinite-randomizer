import {
  byId,
  catalog,
  dataVersion,
  maps,
  modes,
  weaponPlans,
  isSidearm,
} from "./catalog";
import {
  slots,
  type Compartment,
  type Equipment,
  type Issue,
  type Kit,
  type Settings,
  type Size,
  type Slot,
  type Supply,
} from "./types";
import { coreSkills, skills } from "./mastery";
import { priceIssues, allowedPriceRange } from "./price-rules";
import { canWear, wearableRules, wearableErrors } from "./wearables";
import {
  assembleWeapon,
  assemblyErrors,
  assemblyChanges,
} from "./weapon-assembly";

export const defaults: Settings = {
  primaryChance: 65,
  secondChance: 10,
  sidearmOnly: false,
  attachmentDensity: "mixed",
  randomizeAttachments: true,
  supportingParts: "automatic",
  looseRounds: 120,
  magazines: 2,
  ammoMode: "gun",
  storeGunMag: true,
  grenades: 2,
  food: 1,
  drinks: 1,
  extraMeds: 1,
  budget: 0,
  minBudget: 0,
  squadBudget: 0,
  priceRules: "margin",
  priceMargin: 10,
  medical: true,
  ammo: true,
  mastery: false,
  allowCore: false,
  masteryPoints: 12,
  masteryExcluded: [],
  masteryWeights: {},
  coreUnlocked: [],
  categories: Object.fromEntries(slots.map((x) => [x, true])) as Record<
    Slot,
    boolean
  >,
  fixed: {},
  excluded: [],
  weights: {},
  maps: maps.map((x) => x.id),
  modes: Object.keys(modes),
  mapWeights: {},
  modeWeights: {},
  sound: true,
  volume: 65,
  reducedMotion: false,
  reveal: "full",
  theme: "dark",
  saveFixed: false,
  avoidRepeats: false,
  repeatFallback: true,
  secureAmmo: false,
  packing: "supplies",
};

export function random(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++)
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function choose<T extends string>(
  pool: T[],
  rng: () => number,
  weights: Record<string, number> = {},
): T {
  const available = pool.filter((x) => (weights[x] ?? 1) > 0);
  const total = available.reduce((a, x) => a + (weights[x] ?? 1), 0);
  if (!total)
    throw new Error(
      "No eligible items remain. Check your exclusions and weights.",
    );
  let roll = rng() * total;
  for (const value of available) {
    roll -= weights[value] ?? 1;
    if (roll < 0) return value;
  }
  return available.at(-1)!;
}
const equip = (id: string, quantity = 1): Equipment => ({
  id,
  quantity,
  children: [],
});
export const flatten = (node: Equipment): Equipment[] => [
  node,
  ...node.children.flatMap(flatten),
];
export function compartments(kit: Kit): Compartment[] {
  const result: Compartment[] = [];
  for (const slot of ["rig", "bag", "armor"] as Slot[]) {
    const item = kit.gear[slot];
    if (!item) continue;
    byId[item.id]?.compartments?.forEach((size, i) =>
      result.push({ id: `${slot}:${i}`, size }),
    );
  }
  for (let i = 0; i < (kit.mastery?.core === "tactical-belt" ? 8 : 4); i++)
    result.push({ id: `pocket:${i}`, size: [1, 1] });
  result.push({ id: "secure:0", size: [1, 2], secure: true });
  return result;
}
export function pack(
  supplies: Supply[],
  containers: Compartment[],
  secureAmmo = false,
): Supply[] | null {
  const occupied = new Map(containers.map((c) => [c.id, new Set<number>()]));
  const sorted = [...supplies].sort(
    (a, b) => b.size[0] * b.size[1] - a.size[0] * a.size[1],
  );
  const result: Supply[] = [];
  let steps = 0;
  function place(index: number): boolean {
    if (index === sorted.length) return true;
    if (++steps > 30000) return false;
    const item = sorted[index];
    for (const c of containers) {
      if (c.secure && !(secureAmmo && item.role === "reserve")) continue;
      const used = occupied.get(c.id)!;
      const rotations = item.size[0] === item.size[1] ? [false] : [false, true];
      for (const rotated of rotations) {
        const [w, h] = rotated ? [item.size[1], item.size[0]] : item.size;
        for (let y = 0; y <= c.size[1] - h; y++)
          for (let x = 0; x <= c.size[0] - w; x++) {
            const cells: number[] = [];
            for (let yy = y; yy < y + h; yy++)
              for (let xx = x; xx < x + w; xx++)
                cells.push(yy * c.size[0] + xx);
            if (cells.some((cell) => used.has(cell))) continue;
            cells.forEach((cell) => used.add(cell));
            result.push({ ...item, container: c.id, x, y, rotated });
            if (place(index + 1)) return true;
            result.pop();
            cells.forEach((cell) => used.delete(cell));
          }
      }
    }
    return false;
  }
  return place(0)
    ? supplies.map((s) => result.find((x) => x.uid === s.uid)!)
    : null;
}
export function totals(kit: Kit) {
  let entry = 0,
    purchase = 0,
    weight = 0;
  for (const node of Object.values(kit.gear))
    if (node)
      for (const item of flatten(node)) {
        const info = byId[item.id];
        if (!info) continue;
        entry += info.price * item.quantity;
        purchase += info.price * item.quantity;
        weight += info.weight * item.quantity;
        if (item.ammoId && item.rounds) {
          purchase += (byId[item.ammoId]?.price ?? 0) * item.rounds;
          weight += (byId[item.ammoId]?.weight ?? 0) * item.rounds;
        }
      }
  for (const item of kit.supplies) {
    const info = byId[item.id];
    if (!info) continue;
    purchase += info.price * item.quantity;
    weight += info.weight * item.quantity;
    if (item.ammoId && item.rounds) {
      purchase += (byId[item.ammoId]?.price ?? 0) * item.rounds;
      weight += (byId[item.ammoId]?.weight ?? 0) * item.rounds;
    }
  }
  return { entry, purchase, weight, fee: modes[kit.mode]?.fee ?? 0 };
}
export function validate(kit: Kit): Issue[] {
  const issues: Issue[] = [];
  const error = (text: string) => issues.push({ severity: "error", text });
  const mode = modes[kit.mode];
  if (!mode || !maps.find((x) => x.id === kit.map)?.modes.includes(kit.mode)) {
    error("This mode is unavailable on this map.");
    return issues;
  }
  if (kit.mastery) {
    const points = Object.values(kit.mastery.skills).reduce((a, b) => a + b, 0);
    if (
      points !== kit.settings.masteryPoints ||
      Object.keys(kit.mastery.skills).length > 6 ||
      Object.entries(kit.mastery.skills).some(
        ([id, rank]) =>
          !skills.some((s) => s.id === id) ||
          !Number.isInteger(rank) ||
          rank < 1 ||
          rank > 3,
      )
    )
      error("The mastery allocation exceeds its point, rank, or skill limits.");
    if (
      kit.mastery.core &&
      (!kit.settings.allowCore ||
        !kit.settings.coreUnlocked.includes(kit.mastery.core))
    )
      error("This Core Mastery has not been marked unlocked.");
  }
  const value = totals(kit);
  const unpriced = new Set(
    [
      ...Object.values(kit.gear).flatMap((node) =>
        node
          ? flatten(node).flatMap((item) => [item.id, item.ammoId ?? ""])
          : [],
      ),
      ...kit.supplies.flatMap((item) => [item.id, item.ammoId ?? ""]),
    ].filter((id) => byId[id]?.priceKnown === false),
  );
  if (unpriced.size)
    issues.push({
      severity: "notice",
      code: "price-estimate",
      text: `No price estimate for ${[...unpriced].map((id) => byId[id].name).join(", ")}. Purchase totals omit those prices.`,
    });
  issues.push(
    ...priceIssues(
      value.entry,
      { label: `${mode.name} equipped value`, min: mode.min, max: mode.max },
      kit.settings,
    ),
  );
  issues.push(
    ...priceIssues(
      value.purchase,
      {
        label: "Purchase estimate",
        min: kit.settings.minBudget,
        max: kit.settings.budget || Infinity,
      },
      kit.settings,
    ),
  );
  const armor = kit.gear.armor && byId[kit.gear.armor.id];
  if (armor?.category === "armoredRig" && kit.gear.rig)
    error("An armored rig replaces the chest rig.");
  if (
    [kit.gear.gun, kit.gear.second].filter((gun) => gun && isSidearm(gun.id))
      .length > 1
  )
    error("Only one sidearm slot is available.");
  const categories: Record<Slot, string[]> = {
    helmet: ["helmet"],
    armor: ["armor", "armoredRig"],
    rig: ["rig"],
    bag: ["backpack"],
    gun: ["weapon"],
    second: ["weapon"],
    headset: ["headset"],
    face: ["face", "gasMask"],
  };
  for (const slot of slots) {
    const node = kit.gear[slot];
    if (
      node &&
      byId[node.id] &&
      !categories[slot].includes(byId[node.id].category)
    )
      error(`${byId[node.id].name} cannot go in the ${slot} slot.`);
    if (node && !["gun", "second"].includes(slot) && node.children.length)
      error(
        "Unsupported add-on combination. Helmet sockets need verification.",
      );
  }
  for (const message of wearableErrors(kit)) error(message);
  if (byId[kit.gear.face?.id ?? ""]?.category === "gasMask")
    issues.push({
      severity: "notice",
      code: "wearable-estimate",
      text: "Gas-mask fit uses an open-face helmet coverage rule, not a verified per-mask compatibility table. Check the fit in game.",
    });
  for (const node of Object.values(kit.gear))
    if (node)
      for (const part of flatten(node)) {
        const item = byId[part.id];
        if (!item) {
          error(`Unknown item ${part.id}.`);
          continue;
        }
        if (item.tier && item.tier > mode.tier)
          error(`${item.name} exceeds this mode's tier limit.`);
      }
  for (const slot of ["gun", "second"] as Slot[]) {
    const gun = kit.gear[slot];
    if (!gun) continue;
    const plan = weaponPlans.find((p) => p.id === gun.id);
    if (!plan) {
      error(
        `${byId[gun.id]?.name ?? gun.id}: this weapon is unavailable or its availability is unconfirmed. It is excluded from the active pool.`,
      );
      continue;
    }
    const permitted = new Set([
      ...plan.parts.flatMap((p) => p.ids),
      ...plan.magazines,
    ]);
    for (const child of gun.children)
      if (!permitted.has(child.id) || child.children.length)
        error(
          "This weapon has an unsupported attachment or adapter combination.",
        );
    for (const message of assemblyErrors(
      plan,
      gun.children
        .filter((x) => !plan.magazines.includes(x.id))
        .map((x) => x.id),
    ))
      error(message);
    if (plan.verification !== "in-game-checked")
      issues.push({
        severity: "notice",
        code: "attachment-estimate",
        text: `${byId[gun.id].name}: ${plan.verification === "best-guess" ? "attachment fit and basic parts are inferred from weapon families and item descriptions" : "attachment fit uses source descriptions and has not been checked in game"}. Check the build in Gunsmith before buying. Ammo caliber and mode tier checks still apply.`,
      });
    const magazines = [
      ...gun.children.filter((x) => plan.magazines.includes(x.id)),
      ...kit.supplies.filter(
        (x) => x.gun === slot && plan.magazines.includes(x.id),
      ),
    ];
    const designatedCount =
      gun.children.filter((child) => plan.magazines.includes(child.id)).length +
      kit.supplies.filter(
        (item) => item.gun === slot && item.role === "gun-mag",
      ).length;
    if (!plan.internalCapacity && designatedCount !== 1)
      error("A weapon needs exactly one loaded or designated magazine.");
    if (!plan.internalCapacity && gun.ammoId)
      error("This weapon loads ammunition through a magazine.");
    if (plan.internalCapacity) {
      if (
        !gun.rounds ||
        !Number.isInteger(gun.rounds) ||
        gun.rounds > plan.internalCapacity
      )
        error("The weapon's internal chamber is empty or over capacity.");
      if (!gun.ammoId || byId[gun.ammoId]?.ammoTag !== byId[gun.id].ammoTag)
        error(
          "The weapon's internal chamber contains incompatible ammunition.",
        );
      if (gun.ammoId && (byId[gun.ammoId]?.tier ?? 99) > mode.tier)
        error(
          "The weapon's internal chamber contains ammunition above the mode limit.",
        );
    } else if (!magazines.length)
      error(`${byId[gun.id].name} needs a magazine.`);
    for (const mag of magazines) {
      if (!mag.rounds || mag.rounds > (byId[mag.id]?.capacity ?? 0))
        error("A weapon magazine is empty or over capacity.");
      if (!mag.ammoId || byId[mag.ammoId]?.ammoTag !== byId[gun.id].ammoTag)
        error("A magazine contains incompatible ammunition.");
      if (mag.ammoId && (byId[mag.ammoId]?.tier ?? 99) > mode.tier)
        error("A magazine contains ammunition above the mode limit.");
    }
  }
  const cells = new Map<string, Set<string>>();
  const containers = compartments(kit);
  if (new Set(kit.supplies.map((x) => x.uid)).size !== kit.supplies.length)
    error("Packed item identifiers must be unique.");
  for (const item of kit.supplies) {
    const info = byId[item.id];
    if (!info) {
      error(`Unknown supply ${item.id}.`);
      continue;
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1)
      error("An item quantity is invalid.");
    if (info.category !== "ammo" && item.quantity !== 1)
      error("This item does not stack in a single inventory position.");
    if (item.gun) {
      const gun = kit.gear[item.gun],
        plan = weaponPlans.find((p) => p.id === gun?.id);
      if (
        item.role === "reserve" &&
        info.ammoTag !== byId[gun?.id ?? ""]?.ammoTag
      )
        error("Loose reserve ammunition does not match its weapon.");
      if (
        (item.role === "gun-mag" || item.role === "spare-mag") &&
        !plan?.magazines.includes(item.id)
      )
        error("A packed magazine does not match its weapon.");
    }
    if (item.size[0] !== info.size[0] || item.size[1] !== info.size[1])
      error(`${info.name} has an incorrect footprint for this snapshot.`);
    if (
      info.category === "ammo" &&
      (item.quantity > 60 || (info.tier ?? 99) > mode.tier)
    )
      error("An ammunition stack exceeds its stack or mode limit.");
    const c = containers.find((x) => x.id === item.container);
    if (!c || item.x === undefined || item.y === undefined) {
      error(`${info.name} is not packed.`);
      continue;
    }
    const [w, h] = item.rotated ? [item.size[1], item.size[0]] : item.size;
    if (
      !Number.isInteger(item.x) ||
      !Number.isInteger(item.y) ||
      item.x < 0 ||
      item.y < 0 ||
      item.x + w > c.size[0] ||
      item.y + h > c.size[1]
    ) {
      error(`${info.name} does not fit its compartment.`);
      continue;
    }
    if (c.secure && !(kit.settings.secureAmmo && item.role === "reserve"))
      error("Required items must stay outside the secure case.");
    const used = cells.get(c.id) ?? new Set<string>();
    for (let y = item.y; y < item.y + h; y++)
      for (let x = item.x; x < item.x + w; x++) {
        const key = `${x}:${y}`;
        if (used.has(key)) error("Packed items overlap.");
        used.add(key);
      }
    cells.set(c.id, used);
  }
  if (kit.settings.medical)
    for (const c of ["surgery", "healing", "bandage"])
      if (!kit.supplies.some((x) => byId[x.id]?.category === c))
        error(`The kit needs a ${c} item.`);
  return issues;
}
export function generate(
  seed: string,
  settings: Settings,
  previous?: Kit,
  shared?: { map: string; mode: string },
  avoid: string[] = [],
): Kit {
  if (previous?.locked) return structuredClone(previous);
  const rng = random(seed),
    allowed = (id: string) =>
      !settings.excluded.includes(id) && (settings.weights[id] ?? 1) > 0;
  const pick = (ids: string[], label: string) => {
    const pool = ids.filter((id) => byId[id] && allowed(id));
    if (!pool.length)
      throw new Error(
        `No eligible ${label} remains. Change your filters or fixed selections.`,
      );
    return choose(pool, rng, settings.weights);
  };
  const mapPool = maps.filter(
    (m) =>
      settings.maps.includes(m.id) &&
      m.modes.some((mode) => settings.modes.includes(mode)) &&
      (settings.mapWeights[m.id] ?? 1) > 0,
  );
  if (!mapPool.length)
    throw new Error("No map and mode combination matches your settings.");
  const mapId =
    shared?.map ??
    previous?.map ??
    choose(
      mapPool.map((x) => x.id),
      rng,
      settings.mapWeights,
    );
  const map = maps.find((x) => x.id === mapId);
  if (!map) throw new Error("Unknown map.");
  const modeId =
    shared?.mode ??
    previous?.mode ??
    choose(
      map.modes.filter((m) => settings.modes.includes(m)),
      rng,
      settings.modeWeights,
    );
  const mode = modes[modeId];
  if (!mode || !map.modes.includes(modeId))
    throw new Error("This map does not support that mode.");
  const old = previous;
  let last = "";
  for (let attempt = 0; attempt < 240; attempt++) {
    const kit: Kit = {
      id: seed,
      seed,
      created: "",
      dataVersion,
      map: mapId,
      mode: modeId,
      gear: {},
      supplies: [],
      locks: old?.locks ?? [],
      locked: false,
      checked: [],
      notices: [],
      settings: structuredClone(settings),
    };
    if (old?.mastery?.locked) kit.mastery = structuredClone(old.mastery);
    else if (settings.mastery) {
      const allocations: Record<string, number> = {},
        locks = old?.mastery?.locks ?? [];
      for (const id of locks)
        if (old?.mastery?.skills[id]) allocations[id] = old.mastery.skills[id];
      let remaining =
        settings.masteryPoints -
        Object.values(allocations).reduce((a, b) => a + b, 0);
      if (remaining < 0)
        throw new Error("Locked mastery allocations exceed the point budget.");
      while (remaining > 0) {
        const pool = skills
          .filter(
            (s) =>
              !locks.includes(s.id) &&
              !settings.masteryExcluded.includes(s.id) &&
              (allocations[s.id] ?? 0) < 3 &&
              (allocations[s.id] || Object.keys(allocations).length < 6),
          )
          .map((s) => s.id);
        if (!pool.some((id) => (settings.masteryWeights[id] ?? 1) > 0))
          throw new Error(
            "The mastery pool cannot use all available points. Adjust its exclusions, weights, or locks.",
          );
        const id = choose(pool, rng, settings.masteryWeights);
        allocations[id] = (allocations[id] ?? 0) + 1;
        remaining--;
      }
      const cores = coreSkills
        .filter((s) => settings.coreUnlocked.includes(s.id))
        .map((s) => s.id);
      kit.mastery = {
        skills: allocations,
        locks,
        locked: false,
        ...(settings.allowCore && cores.length
          ? { core: choose(cores, rng) }
          : {}),
      };
    }
    const kept = (slot: Slot) =>
      old?.locks.includes(slot) ? structuredClone(old.gear[slot]) : undefined;
    const gearPool = (category: string) =>
      catalog
        .filter(
          (i) =>
            i.category === category && i.eligible && (i.tier ?? 0) <= mode.tier,
        )
        .map((i) => i.id);
    function gear(slot: Slot, categories: string[]) {
      if (old?.locks.includes(slot)) {
        kit.gear[slot] = kept(slot);
        return;
      }
      if (!settings.categories[slot]) {
        const id = settings.fixed[slot];
        if (id) {
          if (!byId[id])
            throw new Error("A fixed item is missing from this snapshot.");
          kit.gear[slot] = equip(id);
        }
        return;
      }
      kit.gear[slot] = equip(pick(categories.flatMap(gearPool), slot));
    }
    const mustKeepRig =
      (old?.locks.includes("rig") && old.gear.rig) ||
      (!settings.categories.rig && settings.fixed.rig);
    gear("armor", mustKeepRig ? ["armor"] : ["armor", "armoredRig"]);
    gear("helmet", ["helmet"]);
    const requiredWearables = (["headset", "face"] as const).flatMap((slot) =>
      old?.locks.includes(slot)
        ? (old.gear[slot]?.id ?? [])
        : !settings.categories[slot] && settings.fixed[slot]
          ? [settings.fixed[slot]!]
          : [],
    );
    if (
      requiredWearables.length &&
      settings.categories.helmet &&
      !old?.locks.includes("helmet")
    ) {
      const compatible = gearPool("helmet").filter((id) =>
        requiredWearables.every((item) => canWear(id, item)),
      );
      if (!compatible.length)
        throw new Error(
          "No helmet fits the locked or chosen face protection and headset. Change those items or unlock them.",
        );
      kit.gear.helmet = equip(pick(compatible, "compatible helmet"));
    }
    gear("bag", ["backpack"]);
    if (byId[kit.gear.armor?.id ?? ""]?.category !== "armoredRig")
      gear("rig", ["rig"]);
    else if (mustKeepRig)
      throw new Error(
        "The fixed or locked chest rig conflicts with this armored rig. Choose body armor.",
      );
    for (const slot of ["headset", "face"] as const) {
      if (old?.locks.includes(slot)) {
        kit.gear[slot] = kept(slot);
        continue;
      }
      if (!settings.categories[slot]) {
        if (settings.fixed[slot]) kit.gear[slot] = equip(settings.fixed[slot]!);
        continue;
      }
      const categories = slot === "headset" ? ["headset"] : ["face", "gasMask"];
      const pool = categories
        .flatMap(gearPool)
        .filter((id) => allowed(id) && canWear(kit.gear.helmet?.id, id));
      if (pool.length)
        kit.gear[slot] = equip(choose(pool, rng, settings.weights));
    }
    if (wearableRules[kit.gear.helmet?.id ?? ""]?.builtInAudio)
      kit.notices.push(
        "This helmet has built-in audio. An external headset is not added.",
      );
    function gun(slot: "gun" | "second", sidearm: boolean) {
      if (old?.locks.includes(slot)) {
        kit.gear[slot] = kept(slot);
        kit.supplies.push(
          ...structuredClone(old.supplies.filter((s) => s.gun === slot)),
        );
        return;
      }
      if (!settings.categories[slot] && !settings.fixed[slot]) return;
      let plans = weaponPlans.filter(
        (p) => isSidearm(p.id) === sidearm && allowed(p.id),
      );
      if (settings.fixed[slot] && !settings.categories[slot])
        plans = weaponPlans.filter((p) => p.id === settings.fixed[slot]);
      const lockedParts = old?.gear[slot]?.partLocks ?? [];
      if (lockedParts.length)
        plans = weaponPlans.filter(
          (p) =>
            allowed(p.id) &&
            (!settings.sidearmOnly || isSidearm(p.id)) &&
            (!settings.fixed[slot] ||
              settings.categories[slot] ||
              p.id === settings.fixed[slot]) &&
            lockedParts.every((id) =>
              p.parts.some((part) => part.ids.includes(id)),
            ),
        );
      const assemblies = new Map<string, string[]>();
      plans = plans.filter((plan) => {
        if (
          !plan.internalCapacity &&
          !plan.magazines.some(
            (id) => allowed(id) && (byId[id]?.capacity ?? 0) > 0,
          )
        )
          return false;
        if (
          !catalog.some(
            (item) =>
              item.kind === "ammo" &&
              item.ammoTag === byId[plan.id].ammoTag &&
              (item.tier ?? 99) <= mode.tier &&
              !item.seasonal &&
              allowed(item.id),
          )
        )
          return false;
        try {
          assemblies.set(
            plan.id,
            assembleWeapon(plan, {
              settings,
              rng: random(`${seed}:${attempt}:${slot}:${plan.id}`),
              locked: lockedParts,
            }),
          );
          return true;
        } catch {
          return false;
        }
      });
      if (settings.avoidRepeats) {
        const unique = plans.filter((p) => !avoid.includes(p.id));
        if (unique.length) plans = unique;
        else if (settings.repeatFallback)
          kit.notices.push("The gun pool was too small to avoid repeats.");
        else throw new Error("The gun pool is too small to avoid repeats.");
      }
      if (!plans.length)
        throw new Error(
          "No working gun matches the weapon pool, part locks, ammunition, and filters.",
        );
      const selected = pick(
        plans.map((p) => p.id),
        "weapon",
      );
      const plan = plans.find((p) => p.id === selected)!;
      const node = equip(plan.id);
      if (lockedParts.length) node.partLocks = [...lockedParts];
      kit.gear[slot] = node;
      node.children = assemblies.get(plan.id)!.map((id) => equip(id));
      const ammoPool = catalog
        .filter(
          (i) =>
            i.kind === "ammo" &&
            i.ammoTag === byId[plan.id].ammoTag &&
            i.tier !== undefined &&
            i.tier <= mode.tier &&
            !i.seasonal,
        )
        .map((i) => i.id);
      const ammo = pick(ammoPool, "ammunition");
      const availableMags = plan.magazines.filter(allowed);
      const magId = plan.internalCapacity
        ? ""
        : settings.randomizeAttachments
          ? pick(availableMags, "magazine")
          : availableMags.includes(plan.basicMagazine ?? "")
            ? plan.basicMagazine!
            : availableMags[0];
      const capacity = plan.internalCapacity ?? byId[magId]?.capacity;
      if (!capacity) throw new Error("Magazine capacity is missing.");
      const internal =
        plan.internal ||
        plan.internalCapacity ||
        plan.internalMagazines?.includes(magId);
      const count = internal ? 1 : Math.max(1, settings.magazines);
      for (let i = 0; i < count; i++) {
        const ammoId =
          settings.ammoMode === "magazine"
            ? pick(ammoPool, "ammunition")
            : ammo;
        if (plan.internalCapacity) {
          node.ammoId = ammoId;
          node.rounds = capacity;
          continue;
        }
        const mag = { ...equip(magId), ammoId, rounds: capacity };
        if (i === 0 && (!settings.storeGunMag || internal))
          node.children.push(mag);
        else
          kit.supplies.push({
            uid: `${slot}-mag-${i}`,
            id: magId,
            quantity: 1,
            size: byId[magId].size,
            gun: slot,
            role: i === 0 ? "gun-mag" : "spare-mag",
            ammoId,
            rounds: capacity,
          });
      }
      if (settings.ammo) {
        let rounds = Math.max(60, settings.looseRounds);
        while (rounds > 0) {
          const quantity = Math.min(rounds, 60);
          kit.supplies.push({
            uid: `${slot}-reserve-${rounds}`,
            id: ammo,
            quantity,
            size: [1, 1],
            gun: slot,
            role: "reserve",
          });
          rounds -= quantity;
        }
      }
    }
    const firstSidearm =
      settings.sidearmOnly || rng() * 100 >= settings.primaryChance;
    gun("gun", firstSidearm);
    if (
      old?.locks.includes("second") ||
      (!settings.categories.second && settings.fixed.second) ||
      (!settings.sidearmOnly && rng() * 100 < settings.secondChance)
    )
      gun(
        "second",
        kit.gear.gun && isSidearm(kit.gear.gun.id)
          ? false
          : rng() * 100 >= settings.primaryChance,
      );
    let supplyIndex = 0;
    function supply(category: string, role: Supply["role"]) {
      const id = pick(gearPool(category), category);
      kit.supplies.push({
        uid: `supply-${supplyIndex++}`,
        id,
        quantity: 1,
        size: byId[id].size,
        role,
      });
    }
    if (settings.medical)
      for (const category of ["surgery", "healing", "bandage"])
        supply(category, "essential");
    for (const [category, max] of [
      ["grenade", settings.grenades],
      ["food", settings.food],
      ["drink", settings.drinks],
    ] as const)
      for (let i = 0, n = Math.floor(rng() * (max + 1)); i < n; i++)
        supply(category, "extra");
    for (
      let i = 0, n = Math.floor(rng() * (settings.extraMeds + 1));
      i < n;
      i++
    )
      supply(
        choose(["healing", "surgery", "bandage", "painkiller", "stim"], rng),
        "extra",
      );
    let packed = pack(kit.supplies, compartments(kit), settings.secureAmmo);
    function tryStorage() {
      const canChange = (slot: Slot) =>
        settings.categories[slot] && !kit.locks.includes(slot);
      if (
        !canChange("bag") &&
        !canChange("rig") &&
        !(
          byId[kit.gear.armor?.id ?? ""]?.category === "armoredRig" &&
          canChange("armor")
        )
      )
        return null;
      for (let trial = 0; trial < 40; trial++) {
        if (canChange("bag")) gear("bag", ["backpack"]);
        if (kit.gear.rig && canChange("rig")) gear("rig", ["rig"]);
        if (
          byId[kit.gear.armor?.id ?? ""]?.category === "armoredRig" &&
          canChange("armor")
        )
          gear("armor", ["armoredRig"]);
        const result = pack(
          kit.supplies,
          compartments(kit),
          settings.secureAmmo,
        );
        if (result) {
          kit.notices.push("Storage was adjusted to fit the supplies.");
          return result;
        }
      }
      return null;
    }
    if (!packed && settings.packing === "storage") packed = tryStorage();
    while (
      !packed &&
      settings.packing === "supplies" &&
      kit.supplies.some((x) => x.role === "extra")
    ) {
      const remove = kit.supplies.findLastIndex((x) => x.role === "extra");
      kit.supplies.splice(remove, 1);
      packed = pack(kit.supplies, compartments(kit), settings.secureAmmo);
      if (!kit.notices.includes("Optional extras were trimmed to fit."))
        kit.notices.push("Optional extras were trimmed to fit.");
    }
    if (!packed && settings.packing === "supplies") packed = tryStorage();
    if (!packed) {
      last = "Required supplies do not fit the available compartments.";
      continue;
    }
    kit.supplies = packed;
    const errors = validate(kit).filter((x) => x.severity === "error");
    if (!errors.length) {
      kit.checked = preserveChecks(old, kit);
      return kit;
    }
    last = errors.map((x) => x.text).join(" ");
  }
  throw new Error(
    `${last} Could not find a valid kit after 240 tries. Adjust your budget, locks, or storage settings.`,
  );
}
export function preserveChecks(old: Kit | undefined, next: Kit) {
  if (!old) return [];
  return old.checked.filter((key) => {
    if (key.includes("/part/")) {
      const [slot, , id] = key.split("/");
      const a = old.gear[slot as Slot]?.children.find((c) => c.id === id),
        b = next.gear[slot as Slot]?.children.find((c) => c.id === id);
      return !!a && !!b && JSON.stringify(a) === JSON.stringify(b);
    }
    if (slots.includes(key as Slot))
      return (
        JSON.stringify(old.gear[key as Slot]) ===
        JSON.stringify(next.gear[key as Slot])
      );
    const a = old.supplies.find((x) => x.uid === key),
      b = next.supplies.find((x) => x.uid === key);
    return (
      !!a &&
      !!b &&
      a.id === b.id &&
      a.quantity === b.quantity &&
      a.ammoId === b.ammoId &&
      a.rounds === b.rounds
    );
  });
}
export function moveSupply(
  kit: Kit,
  uid: string,
  container: string,
  x: number,
  y: number,
  rotated: boolean,
): Kit {
  const result = structuredClone(kit),
    item = result.supplies.find((x) => x.uid === uid);
  if (!item) throw new Error("Item not found.");
  Object.assign(item, { container, x, y, rotated });
  const errors = validate(result).filter((x) => x.severity === "error");
  if (errors.length) throw new Error(errors.map((x) => x.text).join(" "));
  return result;
}
export function rerollPart(
  kit: Kit,
  slot: Slot,
  partSlot: string,
  seed: string,
  chosen?: string,
): Kit {
  if (kit.locked || kit.locks.includes(slot))
    throw new Error("Unlock the weapon before changing its parts.");
  const next = structuredClone(kit),
    gun = next.gear[slot],
    plan = weaponPlans.find((p) => p.id === gun?.id),
    part = plan?.parts.find((p) => p.slot === partSlot);
  if (!gun || !part)
    throw new Error("No compatible attachment slot is available.");
  const existing = gun.children.find((x) => part.ids.includes(x.id));
  if (existing && gun.partLocks?.includes(existing.id))
    throw new Error("Unlock this attachment before rerolling it.");
  const pool = part.ids.filter(
    (id) => byId[id] && !kit.settings.excluded.includes(id),
  );
  if (chosen !== undefined && chosen !== "" && !part.ids.includes(chosen))
    throw new Error("That part does not fit this slot.");
  if (chosen === "" && !part.optional)
    throw new Error("This part is required for a working weapon.");
  const selected = chosen ?? choose(pool, random(seed), kit.settings.weights);
  const before = gun.children
    .filter((x) => !plan!.magazines.includes(x.id))
    .map((x) => x.id);
  const after = assembleWeapon(plan!, {
    settings: kit.settings,
    rng: random(seed),
    previous: before,
    locked: gun.partLocks,
    target: { slot: partSlot, id: selected },
  });
  const changes = assemblyChanges(plan!, before, after);
  const supporting = changes.filter(
    (change) => !change.startsWith(partSlot + ":"),
  );
  if (supporting.length && kit.settings.supportingParts === "manual")
    throw new Error(
      `This part needs supporting changes. ${supporting.join(". ")}. Change these parts or enable automatic supporting parts.`,
    );
  const oldParts = new Map(gun.children.map((x) => [x.id, x]));
  gun.children = [
    ...after.map((id) => oldParts.get(id) ?? equip(id)),
    ...gun.children.filter((x) => plan!.magazines.includes(x.id)),
  ];
  if (supporting.length) {
    next.notices = next.notices.filter(
      (notice) => !notice.startsWith("Supporting parts changed."),
    );
    next.notices.push(`Supporting parts changed. ${supporting.join(". ")}.`);
  }
  next.checked = preserveChecks(kit, next);
  next.seed = seed;
  const errors = validate(next).filter((x) => x.severity === "error");
  if (errors.length) throw new Error(errors.map((x) => x.text).join(" "));
  return next;
}
export function generatePlayer(
  seed: string,
  settings: Settings,
  others: Kit[],
  previous?: Kit,
  shared?: { map: string; mode: string },
  squadRules: Settings = settings,
) {
  const avoid = others.flatMap(
    (k) => [k.gear.gun?.id, k.gear.second?.id].filter(Boolean) as string[],
  );
  const otherCost = others.reduce((sum, k) => sum + totals(k).purchase, 0);
  let destination = shared;
  for (let attempt = 0; attempt < 40; attempt++) {
    const result = generate(
      `${seed}:${attempt}`,
      settings,
      previous,
      destination,
      avoid,
    );
    destination = { map: result.map, mode: result.mode };
    if (
      !squadPriceIssues([...others, result], squadRules).some(
        (i) => i.severity === "error",
      )
    )
      return result;
    if (
      allowedPriceRange({ max: squadRules.squadBudget || Infinity }, squadRules)
        .max -
        otherCost <
        allowedPriceRange({ min: modes[result.mode].min }, settings).min ||
      previous?.locked
    )
      break;
  }
  throw new Error(
    "This player cannot fit the total squad spending cap. Raise the cap, unlock gear, or adjust the other kits.",
  );
}
export function generateSquad(
  seed: string,
  configs: Settings[],
  previous: (Kit | null)[] = [],
): Kit[] {
  if (configs.length < 1 || configs.length > 4)
    throw new Error("A squad needs one to four players.");
  const existing = previous.find(Boolean);
  let shared = existing
    ? { map: existing.map, mode: existing.mode }
    : undefined;
  for (let attempt = 0; attempt < 40; attempt++) {
    const next: Kit[] = [];
    for (let i = 0; i < configs.length; i++) {
      const avoid = next.flatMap(
        (k) => [k.gear.gun?.id, k.gear.second?.id].filter(Boolean) as string[],
      );
      const result = generate(
        `${seed}:${attempt}:${i}`,
        configs[i],
        previous[i] ?? undefined,
        shared,
        avoid,
      );
      shared ??= { map: result.map, mode: result.mode };
      if (result.map !== shared.map || result.mode !== shared.mode)
        throw new Error("A locked player has a different map or mode.");
      next.push(result);
    }
    const rules = configs[0],
      cap = rules.squadBudget;
    if (!squadPriceIssues(next, rules).some((i) => i.severity === "error"))
      return next;
    if (
      configs.reduce(
        (sum, c) =>
          sum + allowedPriceRange({ min: modes[shared!.mode].min }, c).min,
        0,
      ) > allowedPriceRange({ max: cap || Infinity }, rules).max
    )
      break;
  }
  throw new Error(
    "The squad cannot fit its total spending cap. Raise the cap or change the locked kits.",
  );
}
export function squadPriceIssues(kits: Kit[], settings: Settings): Issue[] {
  if (!settings.squadBudget) return [];
  return priceIssues(
    kits.reduce((sum, k) => sum + totals(k).purchase, 0),
    { label: "Squad purchase estimate", max: settings.squadBudget },
    settings,
  );
}
