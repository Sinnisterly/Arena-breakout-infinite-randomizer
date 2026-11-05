import { byId } from "./catalog";
import type { WeaponPlan } from "./weapon-schema";
import type { Settings } from "./types";

const name = (id: string) => byId[id]?.name ?? id;
export function assemblyErrors(plan: WeaponPlan, ids: string[]): string[] {
  const selected = new Set(ids),
    errors: string[] = [];
  const permitted = new Set(plan.parts.flatMap((p) => p.ids));
  for (const id of ids)
    if (!permitted.has(id))
      errors.push(`${name(id)} does not fit this assembly.`);
  for (const part of plan.parts) {
    const count = ids.filter((id) => part.ids.includes(id)).length;
    if (count > 1)
      errors.push(`Multiple parts occupy the ${part.slot.toLowerCase()} slot.`);
    if (!part.optional && count === 0)
      errors.push(`${name(plan.id)} needs its ${part.slot.toLowerCase()}.`);
  }
  for (const id of selected) {
    const rule = plan.rules?.[id];
    for (const alternatives of rule?.requires ?? [])
      if (!alternatives.some((required) => selected.has(required)))
        errors.push(
          `${name(id)} needs ${alternatives.map(name).join(" or ")}.`,
        );
    for (const conflict of rule?.excludes ?? [])
      if (selected.has(conflict))
        errors.push(`${name(id)} cannot be used with ${name(conflict)}.`);
  }
  return errors;
}

type AssemblyOptions = {
  settings: Pick<Settings, "excluded" | "weights" | "attachmentDensity"> &
    Partial<Pick<Settings, "randomizeAttachments">>;
  rng: () => number;
  previous?: string[];
  locked?: string[];
  target?: { slot: string; id: string };
};
export function assembleWeapon(
  plan: WeaponPlan,
  options: AssemblyOptions,
): string[] {
  const { settings, rng, previous, target } = options;
  const locked = options.locked ?? [];
  const randomize = settings.randomizeAttachments !== false;
  const allowed = (id: string) =>
    !!byId[id] &&
    !settings.excluded.includes(id) &&
    (settings.weights[id] ?? 1) > 0;
  for (const id of locked)
    if (!plan.parts.some((p) => p.ids.includes(id)))
      throw new Error(`The weapon cannot keep locked part ${name(id)}.`);
  if (
    target &&
    !plan.parts.some(
      (p) =>
        p.slot === target.slot &&
        (p.ids.includes(target.id) || (!target.id && p.optional)),
    )
  )
    throw new Error("That part does not fit this slot.");
  const domains = plan.parts.map((part) => {
    const fixed = locked.filter((id) => part.ids.includes(id));
    if (fixed.length > 1)
      throw new Error(
        `Locked parts conflict in the ${part.slot.toLowerCase()} slot.`,
      );
    const choice = target?.slot === part.slot ? target.id : undefined;
    if (choice !== undefined && fixed.length && !fixed.includes(choice))
      throw new Error("Unlock this attachment before changing it.");
    if (fixed.length) return fixed;
    if (choice !== undefined) {
      if (choice && !allowed(choice))
        throw new Error(`${name(choice)} is excluded or has zero weight.`);
      return [choice];
    }
    const candidates = part.ids
      .filter(allowed)
      .map((id, index) => ({
        id,
        score: randomize
          ? -Math.log(Math.max(Number.MIN_VALUE, rng())) /
            (settings.weights[id] ?? 1)
          : plan.basicParts?.includes(id)
            ? -1
            : index,
      }))
      .sort((a, b) => a.score - b.score)
      .map((x) => x.id);
    if (part.optional) {
      if (
        !randomize ||
        settings.attachmentDensity === "bare" ||
        (settings.attachmentDensity === "mixed" && rng() < 0.5)
      )
        candidates.unshift("");
      else candidates.push("");
    }
    if (previous) {
      const kept = previous.find((id) => part.ids.includes(id)) ?? "";
      const index = candidates.indexOf(kept);
      if (index >= 0) candidates.unshift(...candidates.splice(index, 1));
    }
    return candidates;
  });
  const selected: string[] = [];
  let visits = 0;
  function feasible(depth: number) {
    const installed = new Set(selected.filter(Boolean));
    for (const id of installed) {
      const rule = plan.rules?.[id];
      if (rule?.excludes?.some((other) => installed.has(other))) return false;
      for (const alternatives of rule?.requires ?? []) {
        if (alternatives.some((other) => installed.has(other))) continue;
        if (
          !domains
            .slice(depth)
            .some((domain) =>
              domain.some((other) => alternatives.includes(other)),
            )
        )
          return false;
      }
    }
    return true;
  }
  function search(depth: number): string[] | undefined {
    if (++visits > 50000)
      throw new Error(
        "This attachment setup is too complex to resolve. Narrow the filters and try again.",
      );
    if (!feasible(depth)) return;
    if (depth === domains.length) return selected.filter(Boolean);
    for (const id of domains[depth]) {
      selected.push(id);
      const result = search(depth + 1);
      if (result) return result;
      selected.pop();
    }
  }
  const result = search(0);
  if (!result)
    throw new Error(
      "No working assembly fits these parts, locks, and filters. Unlock a supporting part or change the selection.",
    );
  return result;
}

export function assemblyChanges(
  plan: WeaponPlan,
  before: string[],
  after: string[],
) {
  return plan.parts.flatMap((part) => {
    const oldId = before.find((id) => part.ids.includes(id));
    const newId = after.find((id) => part.ids.includes(id));
    if (oldId === newId) return [];
    return [
      `${part.slot}: ${oldId ? name(oldId) : "None"} -> ${newId ? name(newId) : "None"}`,
    ];
  });
}
