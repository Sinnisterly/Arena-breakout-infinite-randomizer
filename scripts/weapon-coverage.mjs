import fs from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = async (path) =>
  JSON.parse(await fs.readFile(new URL(path, root), "utf8"));
const catalog = (await read("src/data/catalog.json")).items;
const plans = await read("src/data/weapon-plans.json");
const items = new Map(catalog.map((item) => [item.id, item]));
const weapons = new Set();
const parts = new Set();
for (const plan of plans) {
  if (weapons.has(plan.id)) throw new Error(`Duplicate weapon plan ${plan.id}`);
  weapons.add(plan.id);
  if (items.get(plan.id)?.kind !== "weapon")
    throw new Error(`Unknown weapon ${plan.id}`);
  if (
    !plan.sources?.length ||
    !["source-backed", "best-guess", "in-game-checked"].includes(
      plan.verification,
    )
  )
    throw new Error(`Missing assembly provenance ${plan.id}`);
  for (const source of plan.sources)
    if (new URL(source).protocol !== "https:")
      throw new Error(`Invalid source ${plan.id}`);
  const occupied = new Set(),
    names = new Set();
  for (const slot of plan.parts) {
    if (!slot.slot || names.has(slot.slot) || !slot.ids.length)
      throw new Error(`Invalid attachment slot ${plan.id}`);
    names.add(slot.slot);
    for (const id of slot.ids) {
      if (items.get(id)?.kind !== "accessory" || occupied.has(id))
        throw new Error(`Ambiguous or unknown attachment ${plan.id}/${id}`);
      occupied.add(id);
      parts.add(id);
    }
  }
  if (
    (!plan.magazines.length && !plan.internalCapacity) ||
    new Set(plan.magazines).size !== plan.magazines.length
  )
    throw new Error(`Invalid magazine list ${plan.id}`);
  if (
    plan.internalCapacity &&
    (!Number.isInteger(plan.internalCapacity) ||
      plan.internalCapacity < 1 ||
      plan.internalCapacity > 20 ||
      plan.magazines.length)
  )
    throw new Error(`Invalid internal chamber ${plan.id}`);
  for (const id of plan.magazines) {
    if (!items.get(id)?.capacity || occupied.has(id))
      throw new Error(`Invalid magazine ${plan.id}/${id}`);
    parts.add(id);
  }
  for (const [id, rule] of Object.entries(plan.rules ?? {})) {
    if (!occupied.has(id))
      throw new Error(`Rule for unknown attachment ${plan.id}/${id}`);
    for (const group of rule.requires ?? []) {
      if (
        !group.length ||
        group.includes(id) ||
        group.some((other) => !occupied.has(other))
      )
        throw new Error(`Invalid requirement ${plan.id}/${id}`);
    }
    for (const other of rule.excludes ?? [])
      if (!occupied.has(other) || other === id)
        throw new Error(`Invalid conflict ${plan.id}/${id}`);
  }
  if (
    !catalog.some(
      (item) =>
        item.kind === "ammo" &&
        item.ammoTag === items.get(plan.id).ammoTag &&
        !item.seasonal,
    )
  )
    throw new Error(`No usable ammunition ${plan.id}`);
}
const report = {
  version: 1,
  source: "src/data/weapon-plans.json",
  definition:
    "Catalog records and assembly profiles are counted separately. Source-backed profiles have not been verified in the game. Broad weapon tags do not establish direct attachment fit.",
  catalogWeaponRecords: catalog.filter((item) => item.kind === "weapon").length,
  storedProfiles: plans.length,
  generationProfiles: plans.filter((plan) => !plan.availability).length,
  unavailableProfiles: plans
    .filter((plan) => plan.availability)
    .map((plan) => ({
      id: plan.id,
      name: items.get(plan.id).name,
      reason: plan.availabilityNote,
    })),
  inGameCheckedProfiles: plans.filter(
    (plan) => plan.verification === "in-game-checked",
  ).length,
  bestGuessProfiles: plans.filter(
    (plan) => plan.verification === "best-guess" && !plan.availability,
  ).length,
  candidatePartRecords: parts.size,
  profiles: plans.map((plan) => ({
    id: plan.id,
    name: items.get(plan.id).name,
    slots: plan.parts.length,
    verification: plan.verification,
    sources: plan.sources,
  })),
  withoutAssemblyProfile: catalog
    .filter((item) => item.kind === "weapon" && !weapons.has(item.id))
    .map((item) => ({
      id: item.id,
      name: item.name,
      missing:
        item.id === "102010014"
          ? "Excluded signal gun. Not a combat firearm."
          : "Missing assembly profile.",
    })),
};
await fs.writeFile(
  new URL("data/weapon-coverage.json", root),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  `${report.generationProfiles} active profiles, ${report.unavailableProfiles.length} unconfirmed profiles held out, ${parts.size} stored candidate parts. ${report.withoutAssemblyProfile.length} non-combat record excluded.`,
);
