import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Check,
  ChevronRight,
  ClipboardList,
  Download,
  ExternalLink,
  Lock,
  RotateCcw,
  Settings2,
  Share2,
  Shuffle,
  Unlock,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { toPng } from "html-to-image";
import {
  asset,
  byId,
  catalog,
  dataVersion,
  maps,
  modes,
  sources,
  modeSource,
  modeSources,
  allWeaponPlans,
  weaponPlans,
} from "./catalog";
import {
  compartments,
  defaults,
  generate,
  generatePlayer,
  generateSquad,
  squadPriceIssues,
  moveSupply,
  pack,
  preserveChecks,
  rerollPart,
  totals,
  validate,
} from "./engine";
import {
  decodeShare,
  download,
  encodeShare,
  loadLibrary,
  readSettings,
  recoveryBackup,
  parseLoadout,
  saveLibrary,
} from "./storage";
import { parseBackup } from "./storage";
import { wearableSources, wearableRules } from "./wearables";
import type {
  Challenge,
  ChallengeRule,
  Equipment,
  Kit,
  Library,
  Settings as Config,
  Slot,
  Supply,
} from "./types";
import { slots } from "./types";
import Settings, { labels } from "./Settings";
import Inventory, { ItemIcon } from "./Inventory";
import Modal from "./Modal";
import { Case } from "./Case";
import { sound, warmAudio } from "./audio";
import { coreSkills, masterySource, skills } from "./mastery";
import { shortenLink } from "./shortener";
import ExportCard from "./ExportCard";
import {
  estimatedPrice,
  itemLabel,
  itemEstimate,
  itemPrice,
} from "./presentation";

const newSeed = () => crypto.randomUUID();
const visibleKeys = (kit: Kit) => [
  ...slots,
  "mastery",
  "map",
  "mode",
  ...kit.supplies.map((s) => s.uid),
];
type Detail = { slot?: Slot; uid?: string; id: string };
type Snapshot = {
  kits: (Kit | null)[];
  revealed: string[][];
  configs: Config[];
};
type Panel =
  | "settings"
  | "library"
  | "credits"
  | "catalog"
  | "challenges"
  | "share"
  | "details"
  | "mastery"
  | null;
function initial() {
  const library = loadLibrary();
  const hash = new URLSearchParams(location.hash.slice(1)).get("kit");
  if (hash)
    try {
      const share = decodeShare(hash);
      return {
        library,
        kits: share.kits,
        settings: share.kits.map((k) => k.settings),
        revealed: share.kits.map(visibleKeys),
        shared: true,
        error: "",
      };
    } catch (error) {
      return {
        library,
        kits: [null],
        settings: [library.settings],
        revealed: [[]],
        shared: false,
        error: (error as Error).message,
      };
    }
  const config = structuredClone(library.settings);
  if (!config.saveFixed) config.fixed = {};
  return {
    library,
    kits: [null],
    settings: [config],
    revealed: [slots.filter((s) => !config.categories[s] && !!config.fixed[s])],
    shared: false,
    error: recoveryBackup()
      ? "An unreadable local save was preserved. Open the library to export its recovery file."
      : "",
  };
}
export default function App() {
  const [boot] = useState(initial),
    [library, setLibrary] = useState<Library>(boot.library);
  const [kits, setKits] = useState<(Kit | null)[]>(boot.kits),
    [configs, setConfigs] = useState<Config[]>(boot.settings),
    [revealed, setRevealed] = useState<string[][]>(boot.revealed);
  const [player, setPlayer] = useState(0),
    [panel, setPanel] = useState<Panel>(null),
    [detail, setDetail] = useState<Detail | null>(null);
  const [opening, setOpening] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [drawer, setDrawer] = useState(false),
    [message, setMessage] = useState(boot.error),
    [error, setError] = useState(!!boot.error);
  const [shared, setShared] = useState(boot.shared),
    [undo, setUndo] = useState<Snapshot[]>([]),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("all"),
    [shareScope, setShareScope] = useState<"player" | "squad">("player");
  const [libraryView, setLibraryView] = useState<"saved" | "history">("saved"),
    [customName, setCustomName] = useState(""),
    [customNotes, setCustomNotes] = useState("");
  const [challengeRules, setChallengeRules] = useState<ChallengeRule[]>([]);
  const [exportedImage, setExportedImage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [shortURL, setShortURL] = useState<string | null>(null);
  const [shortening, setShortening] = useState(false);
  const [shortError, setShortError] = useState("");
  const [editContainer, setEditContainer] = useState(""),
    [editX, setEditX] = useState(0),
    [editY, setEditY] = useState(0),
    [editRotate, setEditRotate] = useState(false),
    [swapId, setSwapId] = useState("");
  const [scheme, setScheme] = useState(
    matchMedia("(prefers-color-scheme: light)").matches,
  );
  const skip = useRef(false),
    clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    appRef = useRef<HTMLDivElement>(null);
  const config = configs[player] ?? defaults,
    kit = kits[player],
    shown = revealed[player] ?? [];
  useEffect(() => setExportedImage(null), [kit, shareScope]);
  useEffect(() => {
    const openShare = (event: HashChangeEvent) => {
      const sharedHash = (url: string) =>
        new URLSearchParams(new URL(url).hash.slice(1)).has("kit");
      if (sharedHash(event.oldURL) || sharedHash(event.newURL))
        location.reload();
    };
    window.addEventListener("hashchange", openShare);
    return () => window.removeEventListener("hashchange", openShare);
  }, []);
  const motion = config.reducedMotion || config.reveal === "instant",
    duration = motion ? 0 : config.reveal === "quick" ? 900 : 1800;
  const selected = detail ? byId[detail.id] : undefined;
  useEffect(() => {
    const m = matchMedia("(prefers-color-scheme: light)");
    const change = () => setScheme(m.matches);
    m.addEventListener("change", change);
    return () => m.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    try {
      saveLibrary(library);
    } catch {
      setMessage(
        "The library could not be saved. Export a backup, then remove old entries or check available browser storage.",
      );
      setError(true);
    }
  }, [library]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const tell = (text: string, failed = false) => {
    setMessage(text);
    setError(failed);
  };
  function updateConfig(next: Config) {
    const liveFields = [
      "priceRules",
      "priceMargin",
      "budget",
      "minBudget",
      "supportingParts",
    ] as const;
    if (
      liveFields.some((field) => next[field] !== config[field]) ||
      next.squadBudget !== config.squadBudget
    )
      setKits((old) =>
        old.map((k, i) =>
          k
            ? {
                ...k,
                settings: {
                  ...k.settings,
                  squadBudget: next.squadBudget,
                  ...(i === player
                    ? Object.fromEntries(
                        liveFields.map((field) => [field, next[field]]),
                      )
                    : {}),
                },
              }
            : k,
        ),
      );
    setConfigs((old) =>
      old.map((c, i) =>
        i === player ? next : { ...c, squadBudget: next.squadBudget },
      ),
    );
    if (!kit)
      setRevealed((old) =>
        old.map((r, i) =>
          i === player
            ? slots.filter((s) => !next.categories[s] && !!next.fixed[s])
            : r,
        ),
      );
    if (!shared) setLibrary((old) => ({ ...old, settings: next }));
  }
  function checkpoint() {
    setUndo((old) => [
      ...old.slice(-19),
      structuredClone({ kits, revealed, configs }),
    ]);
  }
  function archive(next: Kit[], name = "Randomized kit") {
    const entry = {
      id: newSeed(),
      name,
      date: new Date().toISOString(),
      kits: structuredClone(next),
      favorite: false,
    };
    setLibrary((old) => ({
      ...old,
      history: [entry, ...old.history].slice(0, 100),
    }));
  }
  function prepare(index = player): Kit {
    if (kits[index]) return kits[index]!;
    const existing = kits.find(Boolean),
      settings = configs[index] ?? config;
    const avoid = kits.flatMap((k) =>
      k ? ["gun", "second"].flatMap((s) => k.gear[s as Slot]?.id ?? []) : [],
    );
    const result = generatePlayer(
      newSeed(),
      settings,
      kits.filter(Boolean) as Kit[],
      undefined,
      existing ? { map: existing.map, mode: existing.mode } : undefined,
      configs[0],
    );
    result.created = new Date().toISOString();
    setKits((old) => old.map((k, i) => (i === index ? result : k)));
    return result;
  }
  const cue = (kind: Parameters<typeof sound>[0]) => {
    if (config.sound) sound(kind, config.volume);
  };
  async function wait(ms: number) {
    const end = performance.now() + ms;
    while (performance.now() < end && !skip.current)
      await new Promise((resolve) => setTimeout(resolve, 25));
  }
  async function revealKeys(
    result: Kit,
    keys: string[],
    index: number,
    record = true,
  ) {
    setBusy(true);
    skip.current = motion;
    warmAudio();
    try {
      await Promise.all(
        keys.map(async (key, order) => {
          if (keys.length > 1) await wait(order * (motion ? 0 : 100));
          const length = slots.includes(key as Slot)
            ? duration
            : Math.min(duration, 450);
          setOpening((old) => [...old, key]);
          cue(key === "map" ? "paper" : "latch");
          await wait(length * 0.34);
          if (!skip.current) cue("open");
          await wait(length * 0.66);
          setRevealed((old) =>
            old.map((r, i) => (i === index ? [...new Set([...r, key])] : r)),
          );
          cue("land");
          setOpening((old) => old.filter((x) => x !== key));
        }),
      );
      const final = [...new Set([...(revealed[index] ?? []), ...keys])];
      if (record && visibleKeys(result).every((k) => final.includes(k)))
        archive([result]);
    } finally {
      setOpening([]);
      setBusy(false);
    }
  }
  async function open(key: string) {
    if (busy) return;
    try {
      const result = prepare();
      if (shown.includes(key)) {
        if (slots.includes(key as Slot) && result.gear[key as Slot])
          inspect({ slot: key as Slot, id: result.gear[key as Slot]!.id });
        return;
      }
      await revealKeys(result, [key], player);
    } catch (e) {
      tell((e as Error).message, true);
    }
  }
  function inspect(next: Detail) {
    setDetail(next);
    setSwapId(next.id);
    const supply = kit?.supplies.find((x) => x.uid === next.uid);
    setEditContainer(supply?.container ?? "");
    setEditX(supply?.x ?? 0);
    setEditY(supply?.y ?? 0);
    setEditRotate(supply?.rotated ?? false);
    setPanel("details");
  }
  async function randomize(index = player) {
    if (busy) return;
    if (kits[index]?.locked) {
      tell("This player is locked. Unlock the kit to roll again.");
      return;
    }
    try {
      const current = kits[index],
        wasShown = revealed[index] ?? [];
      let next = current;
      if (!next) next = prepare(index);
      else if (visibleKeys(next).every((k) => wasShown.includes(k))) {
        checkpoint();
        next = generatePlayer(
          newSeed(),
          configs[index],
          kits.filter((k, i) => i !== index && k) as Kit[],
          next,
          undefined,
          configs[0],
        );
        next.created = new Date().toISOString();
        setKits((old) => old.map((k, i) => (i === index ? next : k)));
        const keep = next.locks.filter((s) => wasShown.includes(s));
        setRevealed((old) =>
          old.map((r, i) => (i === index ? [...keep, "map", "mode"] : r)),
        );
        await revealKeys(
          next,
          visibleKeys(next).filter(
            (k) => !keep.includes(k as Slot) && !["map", "mode"].includes(k),
          ),
          index,
        );
        return;
      }
      await revealKeys(
        next,
        visibleKeys(next).filter((k) => !wasShown.includes(k)),
        index,
      );
      tell("That's the kit. Good luck out there.");
    } catch (e) {
      tell((e as Error).message, true);
    }
  }
  function setKit(next: Kit, historyName?: string) {
    checkpoint();
    setKits((old) => old.map((k, i) => (i === player ? next : k)));
    if (historyName) archive([next], historyName);
  }
  function lock(slot: Slot) {
    if (!kit || !shown.includes(slot)) {
      tell("Open the slot before locking it.");
      return;
    }
    if (kit.locked) {
      tell("Unlock this player first.");
      return;
    }
    const locks = kit.locks.includes(slot)
      ? kit.locks.filter((s) => s !== slot)
      : [...kit.locks, slot];
    setKit({ ...kit, locks });
  }
  async function reroll(slot: Slot) {
    if (busy) return;
    if (!kit) {
      await open(slot);
      return;
    }
    if (kit.locked || kit.locks.includes(slot)) {
      tell("Unlock this item before rerolling it.");
      return;
    }
    try {
      const old = structuredClone(kit);
      old.locks = slots.filter((s) => s !== slot);
      const next = generatePlayer(
        newSeed(),
        config,
        kits.filter((k, i) => i !== player && k) as Kit[],
        old,
        undefined,
        configs[0],
      );
      next.locks = kit.locks;
      next.created = new Date().toISOString();
      next.mastery = kit.mastery;
      const isGun = slot === "gun" || slot === "second";
      const unchanged = kit.supplies.filter((s) => !isGun || s.gun !== slot);
      const replacement = isGun
        ? next.supplies.filter((s) => s.gun === slot)
        : [];
      const packed = pack(
        [...unchanged, ...replacement],
        compartments(next),
        next.settings.secureAmmo,
      );
      if (!packed)
        throw new Error(
          "The new item does not fit with your current supplies. Choose different storage or reroll the unlocked kit.",
        );
      next.supplies = packed;
      const problems = validate(next).filter((x) => x.severity === "error");
      if (problems.length)
        throw new Error(problems.map((x) => x.text).join(" "));
      const changed = new Set([slot]);
      for (const s of slots)
        if (JSON.stringify(next.gear[s]) !== JSON.stringify(kit.gear[s]))
          changed.add(s);
      next.checked = preserveChecks(kit, next);
      setKit(next, `${labels[slot]} reroll`);
      setRevealed((old) =>
        old.map((r, i) =>
          i === player ? r.filter((k) => !changed.has(k as Slot)) : r,
        ),
      );
      await revealKeys(next, [...changed], player, false);
    } catch (e) {
      tell((e as Error).message, true);
    }
  }
  async function rerollMastery() {
    if (!kit || busy || kit.locked || kit.mastery?.locked) return;
    try {
      const old = structuredClone(kit);
      old.locks = [...slots];
      const next = generate(newSeed(), config, old);
      next.locks = kit.locks;
      const packed = pack(kit.supplies, compartments(next), config.secureAmmo);
      if (!packed)
        throw new Error(
          "The new mastery leaves too little storage for this kit. Move supplies out of the extra pockets before rerolling.",
        );
      next.supplies = packed;
      setKit(next, "Mastery reroll");
      setRevealed((old) =>
        old.map((r, i) =>
          i === player ? r.filter((k) => k !== "mastery") : r,
        ),
      );
      setPanel(null);
      await revealKeys(next, ["mastery"], player, false);
    } catch (e) {
      tell((e as Error).message, true);
    }
  }
  async function changePart(partSlot: string, chosen?: string) {
    if (!kit || !detail?.slot || busy) return;
    try {
      const next = rerollPart(kit, detail.slot, partSlot, newSeed(), chosen);
      setKit(next, chosen === undefined ? `${partSlot} reroll` : undefined);
      if (chosen === undefined) {
        setPanel(null);
        setRevealed((old) =>
          old.map((r, i) =>
            i === player ? r.filter((k) => k !== detail.slot) : r,
          ),
        );
        await revealKeys(next, [detail.slot], player, false);
      } else
        tell(
          next.notices.at(-1) !== kit.notices.at(-1) && next.notices.length > 0
            ? next.notices.at(-1)!
            : "Part changed.",
        );
    } catch (e) {
      tell((e as Error).message, true);
    }
  }
  async function randomizeSquad() {
    if (busy) return;
    try {
      checkpoint();
      const next = generateSquad(newSeed(), configs, kits);
      for (const result of next) result.created = new Date().toISOString();
      setKits(next);
      setRevealed(
        next.map((k) =>
          k.locked ? visibleKeys(k) : [...k.locks, "map", "mode"],
        ),
      );
      for (let i = 0; i < next.length; i++)
        if (!next[i].locked) {
          setPlayer(i);
          await revealKeys(
            next[i],
            visibleKeys(next[i]).filter(
              (k) =>
                !next[i].locks.includes(k as Slot) &&
                !["map", "mode"].includes(k),
            ),
            i,
          );
        }
      archive(next, "Squad roll");
      tell("The squad is ready.");
    } catch (e) {
      tell((e as Error).message, true);
    }
  }
  function recordOutcome(challenge: Challenge, outcome: "win" | "loss") {
    try {
      const next = { ...config };
      const bounds: Record<ChallengeRule["field"], [number, number]> = {
        primaryChance: [0, 100],
        secondChance: [0, 100],
        budget: [0, 100000000],
        grenades: [0, 20],
        looseRounds: [60, 600],
      };
      for (const rule of challenge.rules ?? [])
        if (rule.when === outcome) {
          const [min, max] = bounds[rule.field];
          next[rule.field] = Math.max(
            min,
            Math.min(
              max,
              rule.operation === "set"
                ? rule.value
                : next[rule.field] + rule.value,
            ),
          );
        }
      updateConfig(readSettings(next));
      setLibrary((old) => ({
        ...old,
        challenges: old.challenges.map((c) =>
          c.id === challenge.id
            ? {
                ...c,
                wins: c.wins + (outcome === "win" ? 1 : 0),
                losses: c.losses + (outcome === "loss" ? 1 : 0),
                streak: outcome === "win" ? (c.streak ?? 0) + 1 : 0,
              }
            : c,
        ),
      }));
      tell("Outcome recorded. Any rule changes apply to your next roll.");
    } catch (e) {
      tell((e as Error).message, true);
    }
  }
  function slotClick(slot: Slot, event: React.MouseEvent) {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    if (event.shiftKey) {
      void reroll(slot);
      return;
    }
    if (!kit) {
      void open(slot);
      return;
    }
    if (!shown.includes(slot)) {
      void open(slot);
      return;
    }
    clickTimer.current = setTimeout(() => {
      if (kit?.gear[slot]) inspect({ slot, id: kit.gear[slot]!.id });
      else if (
        slot === "headset" &&
        kit?.gear.helmet &&
        wearableRules[kit.gear.helmet.id]?.builtInAudio
      )
        inspect({ slot: "helmet", id: kit.gear.helmet.id });
      else tell(`${labels[slot]} is empty in this roll.`);
    }, 230);
  }
  function reset() {
    if (busy) return;
    checkpoint();
    setKits([null]);
    setRevealed([
      slots.filter((s) => !config.categories[s] && !!config.fixed[s]),
    ]);
    setConfigs([config]);
    setPlayer(0);
    tell("Fresh cases. Your settings are still here.");
  }
  function reload(next: Kit[]) {
    if (busy) return;
    checkpoint();
    setKits(structuredClone(next));
    setConfigs(next.map((x) => x.settings));
    setRevealed(next.map(visibleKeys));
    setPlayer(0);
    setPanel(null);
    tell(
      next.some((k) => k.dataVersion !== dataVersion)
        ? "Loaded an older snapshot. Review its items and rules before using it."
        : "Loadout restored.",
    );
  }
  function saveCurrent() {
    if (!kit) {
      tell("Roll a kit first.");
      return;
    }
    const name = prompt(
      "Loadout name",
      `${maps.find((m) => m.id === kit.map)?.name} kit`,
    );
    if (name?.trim()) {
      setLibrary((old) => ({
        ...old,
        saved: [
          {
            id: newSeed(),
            name: name.trim().slice(0, 100),
            date: new Date().toISOString(),
            kits: structuredClone([kit]),
            favorite: false,
          },
          ...old.saved,
        ],
      }));
      tell("Saved in your library.");
    }
  }
  function entryText(results: Kit[]) {
    return results
      .map(
        (k, index) =>
          `PLAYER ${index + 1} | ${maps.find((m) => m.id === k.map)?.name} | ${modes[k.mode]?.name}\nSeed: ${k.seed}\n${Object.entries(
            k.gear,
          )
            .filter(([, v]) => v)
            .map(
              ([s, n]) =>
                `${labels[s as Slot]}: ${byId[n!.id]?.name ?? n!.id}${n!.rounds ? ` / ${n!.rounds} rounds / ${itemLabel(n!.ammoId!)}` : ""}\n${n!.children.map((c) => "  - " + (byId[c.id]?.name ?? c.id) + (c.rounds ? ` (${c.rounds} ${itemLabel(c.ammoId!)})` : "")).join("\n")}`,
            )
            .join(
              "\n",
            )}\nPACKED\n${k.supplies.map((s) => `- ${itemLabel(s.id)} x${s.quantity}${s.rounds ? ` (${s.rounds} ${itemLabel(s.ammoId!)})` : ""}${s.role === "gun-mag" ? " [insert after entry]" : ""}`).join("\n")}\nMASTERY\n${
            k.mastery
              ? Object.entries(k.mastery.skills)
                  .map(
                    ([id, rank]) =>
                      (skills.find((s) => s.id === id)?.name ?? id) +
                      ": rank " +
                      rank,
                  )
                  .join("\n") +
                "\nCore: " +
                (coreSkills.find((s) => s.id === k.mastery?.core)?.name ??
                  "None")
              : "Off"
          }\nEntry estimate ${estimatedPrice(totals(k).entry)} | Purchase estimate ${estimatedPrice(totals(k).purchase)}\n${validate(
            k,
          )
            .filter(
              (i) =>
                i.code === "price-estimate" ||
                i.code === "attachment-estimate" ||
                i.code === "wearable-estimate",
            )
            .map(
              (i) =>
                `${i.severity === "error" ? "Price check" : "Best guess"}: ${i.text}`,
            )
            .join("\n")}\n`,
      )
      .join("\n")
      .concat(
        results.length > 1
          ? "\n" +
              squadPriceIssues(results, results[0].settings)
                .map(
                  (i) =>
                    `${i.severity === "error" ? "Price check" : "Best guess"} / squad: ${i.text}`,
                )
                .join("\n")
          : "",
      )
      .concat("\nAll prices are approximate (~), not exact.\n");
  }
  const selectedKits = (shareScope === "player" ? [kit] : kits).filter(
    Boolean,
  ) as Kit[];
  const shareReady =
    shareScope === "player"
      ? !!kit && visibleKeys(kit).every((k) => shown.includes(k))
      : kits.every(
          (k, i) =>
            !!k && visibleKeys(k).every((key) => revealed[i]?.includes(key)),
        );
  const shareKits = shareReady ? selectedKits : [];
  const shareURL = shareKits.length
    ? `${import.meta.env.VITE_PUBLIC_SITE_URL || location.origin + location.pathname}#kit=${encodeShare(shareKits, config)}`
    : "";
  useEffect(() => {
    setShortURL(null);
    setShortError("");
    if (panel !== "share" || !shareURL) {
      setShortening(false);
      return;
    }
    let active = true;
    const controller = new AbortController();
    setShortening(true);
    shortenLink(shareURL, { signal: controller.signal })
      .then((url) => {
        if (active) setShortURL(url);
      })
      .catch((error) => {
        if (active)
          setShortError(
            error instanceof Error
              ? error.message
              : "The full link is available below.",
          );
      })
      .finally(() => {
        if (active) setShortening(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [panel, shareURL]);
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      tell("Copied.");
    } catch {
      tell(
        "Copy was unavailable. You can select the text in the share panel.",
        true,
      );
    }
  }
  async function imageExport() {
    if (!shareKits.length) return;
    setExporting(true);
    try {
      const element = document.getElementById("share-image")!;
      const url = await toPng(element, {
        pixelRatio: 2,
        backgroundColor: "#17221b",
        cacheBust: false,
      });
      setExportedImage(url);
      tell("Image ready. Download the PNG or save the preview.");
    } catch {
      tell(
        "Image export failed. Text and the exact share link are still available.",
        true,
      );
    } finally {
      setExporting(false);
    }
  }
  function repackMove() {
    if (!kit || !detail?.uid) return;
    try {
      const next = moveSupply(
        kit,
        detail.uid,
        editContainer,
        editX,
        editY,
        editRotate,
      );
      setKit(next);
      tell("Item moved.");
    } catch (e) {
      tell((e as Error).message, true);
    }
  }
  function swap() {
    if (!kit || !detail || !byId[swapId]) return;
    if (kit.locked || (detail.slot && kit.locks.includes(detail.slot))) {
      tell("Unlock this item first.");
      return;
    }
    const next = structuredClone(kit);
    if (detail.uid) {
      const item = next.supplies.find((x) => x.uid === detail.uid)!;
      item.id = swapId;
      item.size = byId[swapId].size;
    } else if (detail.slot) {
      next.gear[detail.slot] = { id: swapId, quantity: 1, children: [] };
    }
    const packed = pack(
      next.supplies,
      compartments(next),
      next.settings.secureAmmo,
    );
    if (packed) next.supplies = packed;
    const errors = validate(next).filter((x) => x.severity === "error");
    if (
      errors.length &&
      !confirm(
        `This swap will not work under the current rules:\n\n${errors.map((x) => x.text).join("\n")}\n\nKeep it anyway? The loadout will be marked invalid.`,
      )
    )
      return;
    next.checked = next.checked.filter(
      (x) => x !== detail.slot && x !== detail.uid,
    );
    setKit(next);
    setDetail({ ...detail, id: swapId });
    tell(
      errors.length
        ? "Swap kept. This kit has rule or compatibility problems."
        : "Item swapped.",
      !!errors.length,
    );
  }
  function toggleCheck(key: string) {
    if (!kit) return;
    const checked = new Set(kit.checked),
      isChecked = checked.has(key);
    if (slots.includes(key as Slot)) {
      const keys = [
        key,
        ...(kit.gear[key as Slot]?.children.map((c) => `${key}/part/${c.id}`) ??
          []),
      ];
      for (const id of keys)
        if (isChecked) checked.delete(id);
        else checked.add(id);
    } else {
      if (isChecked) checked.delete(key);
      else checked.add(key);
      if (key.includes("/part/")) {
        const slot = key.split("/")[0] as Slot;
        const children = kit.gear[slot]?.children ?? [];
        if (children.every((c) => checked.has(`${slot}/part/${c.id}`)))
          checked.add(slot);
        else checked.delete(slot);
      }
    }
    setKits((old) =>
      old.map((k, i) =>
        i === player && k ? { ...k, checked: [...checked] } : k,
      ),
    );
  }
  const allRows = kit
    ? [
        ...slots
          .filter((s) => kit.gear[s] && shown.includes(s))
          .map((s) => ({
            key: s,
            id: kit.gear[s]!.id,
            quantity: 1,
            node: kit.gear[s],
            ammoId: kit.gear[s]!.ammoId,
            rounds: kit.gear[s]!.rounds,
            estimate: itemEstimate(kit.gear[s]!),
            priceText: itemPrice(kit.gear[s]!),
          })),
        ...kit.supplies
          .filter((s) => shown.includes(s.uid))
          .map((s) => ({
            key: s.uid,
            id: s.id,
            quantity: s.quantity,
            node: undefined as Equipment | undefined,
            ammoId: s.ammoId,
            rounds: s.rounds,
            estimate: itemEstimate(s),
            priceText: itemPrice(s),
          })),
      ]
    : [];
  const issues = kit
    ? [
        ...validate(kit),
        ...squadPriceIssues(kits.filter(Boolean) as Kit[], configs[0]),
      ]
    : [];
  const kitErrors = issues.filter((i) => i.severity === "error");
  const priceNotices = issues.filter(
    (i) => i.severity === "notice" && i.code === "price-estimate",
  );
  const otherNotices = issues.filter(
    (i) =>
      i.severity === "notice" &&
      i.code !== "price-estimate" &&
      i.code !== "attachment-estimate" &&
      i.code !== "wearable-estimate",
  );
  const attachmentNotices = issues.filter(
    (i) => i.code === "attachment-estimate" || i.code === "wearable-estimate",
  );
  const currentTotals = kit ? totals(kit) : null;
  const mapVisible = shown.includes("map"),
    modeVisible = shown.includes("mode");
  const map = kit ? maps.find((m) => m.id === kit.map) : null;
  const remaining = kit
    ? visibleKeys(kit).filter((k) => !shown.includes(k)).length
    : 1;
  const theme =
    config.theme === "system" ? (scheme ? "light" : "dark") : config.theme;
  const titles: Record<Exclude<Panel, null>, string> = {
    settings: `Player ${player + 1} settings`,
    library: "Your library",
    credits: "Sources and credits",
    catalog: "Item catalog",
    challenges: "Challenge runs",
    share: "Share the kit",
    details: selected ? itemLabel(selected.id) : "Item details",
    mastery: "Mastery allocation",
  };
  function gearSlot(slot: Slot) {
    const fixedId = !config.categories[slot] ? config.fixed[slot] : undefined;
    const node =
        kit?.gear[slot] ??
        (!kit && fixedId
          ? { id: fixedId, quantity: 1, children: [] }
          : undefined),
      visible = shown.includes(slot),
      locked = kit?.locks.includes(slot);
    return (
      <div
        role="group"
        aria-label={labels[slot]}
        data-slot={slot}
        className={`slot ${slot === "gun" ? "gun" : ""} ${visible ? "" : "concealed"} ${opening.includes(slot) ? "opening" : ""} ${locked ? "locked" : ""}`}
        key={slot}
      >
        <button
          className="slot-main"
          disabled={busy}
          onClick={(e) => slotClick(slot, e)}
          onDoubleClick={() => {
            if (clickTimer.current) clearTimeout(clickTimer.current);
            lock(slot);
          }}
          title={
            node
              ? `${byId[node.id]?.name ?? node.id} / ${estimatedPrice(byId[node.id]?.price ?? 0)} Koen. Click for details.`
              : "Open this slot"
          }
          aria-label={`${visible ? "Details for" : "Open"} ${labels[slot]}`}
        >
          <label>
            {labels[slot]}
            {locked && " / locked"}
          </label>
          {visible ? (
            <>
              {node ? (
                <>
                  <ItemIcon id={node.id} />
                  <span className="name">
                    {byId[node.id]?.name ?? `Missing item ${node.id}`}
                  </span>
                  <span className="tier">
                    {byId[node.id]?.tier
                      ? `T${byId[node.id].tier}`
                      : weaponPlans.find((p) => p.id === node.id)
                            ?.verification !== "in-game-checked" &&
                          byId[node.id]?.kind === "weapon"
                        ? "Best guess"
                        : ""}
                  </span>
                </>
              ) : slot === "headset" &&
                kit?.gear.helmet &&
                wearableRules[kit.gear.helmet.id]?.builtInAudio ? (
                <>
                  <ItemIcon id={kit.gear.helmet.id} />
                  <span className="name">Built into helmet</span>
                </>
              ) : (
                <span className="empty-slot">None this time</span>
              )}
            </>
          ) : (
            <span className="question">
              <Case opening={opening.includes(slot)} duration={duration || 1} />
              <small>Click to open</small>
            </span>
          )}
        </button>
        {visible && (
          <div className="slot-tools">
            <button
              title={`Reroll ${labels[slot]} (Shift-click)`}
              aria-label={`Reroll ${labels[slot]}`}
              onClick={() => void reroll(slot)}
              disabled={busy || locked || kit?.locked}
            >
              <RotateCcw size={13} />
            </button>
            <button
              title="Toggle lock (double-click)"
              aria-label={`${locked ? "Unlock" : "Lock"} ${labels[slot]}`}
              onClick={() => lock(slot)}
              disabled={busy || kit?.locked}
            >
              {locked ? <Lock size={13} /> : <Unlock size={13} />}
            </button>
          </div>
        )}
      </div>
    );
  }
  return (
    <div
      ref={appRef}
      style={
        {
          "--workbench": `url("${new URL(asset("assets/armory-scene.png"), document.baseURI).href}")`,
        } as CSSProperties
      }
      className={`world ${theme === "light" ? "light" : ""} ${motion ? "instant" : ""}`}
    >
      <nav className="nav">
        <button
          className="wordmark"
          onClick={() => setPanel(null)}
          aria-label="ABI Randomizer home"
        >
          <span className="emblem">
            <img src={asset("assets/armory-insignia.png")} alt="" />
          </span>
          <span>
            <b>ABI RANDOMIZER</b>
            <small>Open it. Run it. See what happens.</small>
          </span>
        </button>
        <div className="links">
          <button
            onClick={() => setPanel(null)}
            className={!panel ? "current" : ""}
          >
            The armory
          </button>
          <button onClick={() => setPanel("challenges")}>Challenges</button>
          <button onClick={() => setPanel("library")}>Library</button>
          <button onClick={() => setPanel("catalog")}>Catalog</button>
        </div>
        <div className="nav-tools">
          <button
            onClick={() => updateConfig({ ...config, sound: !config.sound })}
            aria-label={config.sound ? "Mute sound" : "Enable sound"}
          >
            {config.sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          <button onClick={() => setPanel("settings")}>
            <Settings2 size={15} />
            <span>Settings</span>
          </button>
        </div>
      </nav>
      {shared && (
        <div className="share-banner">
          You are viewing a shared loadout. Your saved defaults are unchanged.
          <button
            onClick={() => {
              const saved = structuredClone(library.settings);
              if (!saved.saveFixed) saved.fixed = {};
              history.replaceState(
                null,
                "",
                location.pathname + location.search,
              );
              setKits([null]);
              setConfigs([saved]);
              setRevealed([
                slots.filter(
                  (slot) => !saved.categories[slot] && !!saved.fixed[slot],
                ),
              ]);
              setPlayer(0);
              setUndo([]);
              setPanel(null);
              setDrawer(false);
              setShared(false);
              tell("Your saved settings are back. Roll a new kit when ready.");
            }}
          >
            Return to my setup
          </button>
        </div>
      )}
      <header className="intro">
        <div>
          <h1>WHAT ARE WE RUNNING TODAY?</h1>
          <p>Open one slot at a time, or roll the whole kit.</p>
        </div>
        <div className="map-ticket">
          <button
            className={`map-photo ${mapVisible ? "" : "map-hidden"}`}
            onClick={() => void open("map")}
            disabled={busy}
            aria-label={
              mapVisible ? "Reroll map and mode in settings" : "Reveal map"
            }
          >
            {mapVisible && map && (
              <>
                <img
                  src={asset(`assets/${map.image}`)}
                  alt={`${map.name} preview`}
                />
                <strong>{map.name}</strong>
              </>
            )}
            {!mapVisible && <span className="map-q">?</span>}
          </button>
          <div className="map-caption">
            <span>Your next stop</span>
            <button
              className="mode-pill"
              style={{
                color: modeVisible ? modes[kit?.mode ?? ""]?.color : undefined,
              }}
              onClick={() => void open("mode")}
              disabled={busy}
              aria-label="Reveal mode"
            >
              {modeVisible ? modes[kit?.mode ?? ""]?.name : "?"}
            </button>
            <button
              className="map-reroll"
              aria-label="Reroll shared map and mode"
              disabled={busy}
              onClick={() => {
                if (
                  !confirm(
                    "Reroll the squad map and mode? Unlocked gear may need to change. Locked or fixed gear will be preserved.",
                  )
                )
                  return;
                try {
                  const seed = newSeed(),
                    first = generate(seed, configs[0]);
                  const next = kits.map((k, i) =>
                    generate(seed + "-" + i, configs[i], k ?? undefined, {
                      map: first.map,
                      mode: first.mode,
                    }),
                  );
                  if (
                    next.some(
                      (k) => k.map !== first.map || k.mode !== first.mode,
                    )
                  )
                    throw new Error(
                      "A locked player prevents changing the shared map and mode. Unlock that player first.",
                    );
                  checkpoint();
                  setKits(next);
                  setRevealed(next.map((k) => k.locks));
                  archive(next, "Map and mode reroll");
                  tell("New destination ready. Open the map to reveal it.");
                } catch (e) {
                  tell((e as Error).message, true);
                }
              }}
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>
      </header>
      <main className="workspace">
        <div className="squadbar">
          <div className="squad-tabs">
            {kits.map((k, i) => (
              <button
                key={i}
                className={player === i ? "selected" : ""}
                disabled={busy}
                onClick={() => {
                  setPlayer(i);
                  setDetail(null);
                }}
              >
                {k?.locked && <Lock size={11} />} Player {i + 1}
              </button>
            ))}
            {kits.length < 4 && (
              <button
                className="add"
                disabled={busy}
                onClick={() => {
                  setKits((old) => [...old, null]);
                  setConfigs((old) => [...old, structuredClone(config)]);
                  setRevealed((old) => [...old, []]);
                  setPlayer(kits.length);
                  tell("New player ready. Press Randomize when you are ready.");
                }}
              >
                + Player
              </button>
            )}
          </div>
          <div className="button-row">
            {kits.length > 1 && (
              <button
                disabled={busy}
                className="small-button"
                onClick={() => {
                  checkpoint();
                  setKits((old) => old.filter((_, i) => i !== player));
                  setConfigs((old) => old.filter((_, i) => i !== player));
                  setRevealed((old) => old.filter((_, i) => i !== player));
                  setPlayer(0);
                }}
              >
                Remove player
              </button>
            )}
            <button
              className="kit-lock"
              disabled={!kit || busy}
              onClick={() => kit && setKit({ ...kit, locked: !kit.locked })}
            >
              {kit?.locked ? <Unlock size={13} /> : <Lock size={13} />}{" "}
              {kit?.locked ? "Unlock kit" : "Lock kit"}
            </button>
          </div>
        </div>
        <div className="coverage-strip">
          <span>Attachment fit: best guess</span> {weaponPlans.length} guns
          available. Inferred builds need a Gunsmith check. Wearables follow
          sourced pairings and coverage checks.{" "}
          <button onClick={() => setPanel("credits")}>
            See data coverage <ChevronRight size={12} />
          </button>
        </div>
        <div className="workspace-grid" id="loadout-view">
          <section className="bench">
            <div className="bench-head">
              <h2>Player {player + 1}'s kit</h2>
              <span>
                {busy
                  ? "Opening cases..."
                  : kit
                    ? remaining
                      ? `${remaining} left to open`
                      : "Ready to gear up"
                    : "Click a slot to start"}
                {!busy &&
                  kit &&
                  remaining === 0 &&
                  (priceNotices.length > 0 || attachmentNotices.length > 0) && (
                    <b className="best-guess-inline">Best guess</b>
                  )}
              </span>
            </div>
            <div className="equipment">
              {gearSlot("helmet")}
              {gearSlot("armor")}
              {gearSlot("rig")}
              {gearSlot("gun")}
              {gearSlot("bag")}
              {gearSlot("second")}
              <div
                className={`slot mastery-slot ${config.mastery && !shown.includes("mastery") ? "concealed" : ""}`}
              >
                <button
                  className="slot-main"
                  disabled={busy}
                  onClick={() => {
                    if (!config.mastery) setPanel("settings");
                    else if (shown.includes("mastery")) setPanel("mastery");
                    else void open("mastery");
                  }}
                >
                  <label>Mastery</label>
                  {config.mastery && !shown.includes("mastery") ? (
                    <span className="question">
                      <Case
                        opening={opening.includes("mastery")}
                        duration={duration || 1}
                      />
                      <small>Click to open</small>
                    </span>
                  ) : (
                    <>
                      <span className="mastery-mark">
                        {kit?.mastery && shown.includes("mastery")
                          ? Object.values(kit.mastery.skills).reduce(
                              (a, b) => a + b,
                              0,
                            )
                          : "?"}
                      </span>
                      <span className="name">
                        {kit?.mastery && shown.includes("mastery")
                          ? `${Object.keys(kit.mastery.skills).length} skills / inspect`
                          : "Off by default"}
                      </span>
                    </>
                  )}
                </button>
              </div>
              {gearSlot("headset")}
              {gearSlot("face")}
            </div>
            <div className="storage-zone">
              {kit ? (
                <Inventory
                  kit={kit}
                  revealed={shown}
                  onItem={(s) => inspect({ uid: s.uid, id: s.id })}
                  onOpen={(key) => void open(key)}
                />
              ) : (
                <div className="empty-storage">
                  <h3>Make room for whatever turns up.</h3>
                  <p>
                    Your rig, backpack, and packed supplies will appear here.
                  </p>
                  <button onClick={() => void open("rig")}>
                    Open the chest rig <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="controls-row">
              <div className="button-row">
                <button
                  onClick={saveCurrent}
                  disabled={!kit || busy || remaining > 0}
                >
                  Save kit
                </button>
                <button
                  onClick={() => setPanel("share")}
                  disabled={!kit || busy || remaining > 0}
                >
                  Share / export
                </button>
                <button
                  disabled={!undo.length || busy}
                  onClick={() => {
                    const prior = undo.at(-1)!;
                    setKits(prior.kits);
                    setRevealed(prior.revealed);
                    setConfigs(prior.configs);
                    setUndo((old) => old.slice(0, -1));
                    setPlayer(Math.min(player, prior.kits.length - 1));
                    tell("Undone.");
                  }}
                >
                  Undo
                </button>
              </div>
              <button disabled={busy} onClick={reset}>
                Clear the bench
              </button>
            </div>
            <p className="shortcut-hint">
              Click: open or inspect. Shift-click: reroll. Double-click: lock.
              Buttons work on touch, too.
            </p>
          </section>
        </div>
        {kit && (
          <div className="kit-status">
            {remaining === 0 && currentTotals && (
              <>
                <div className="estimates">
                  <span>
                    Entry estimate <b>{estimatedPrice(currentTotals.entry)}</b>
                  </span>
                  <span>
                    Purchase estimate{" "}
                    <b>{estimatedPrice(currentTotals.purchase)}</b>
                  </span>
                  <span>
                    Weight <b>{currentTotals.weight.toFixed(1)} kg</b>
                  </span>
                  <span>
                    Entry fee <b>{estimatedPrice(currentTotals.fee)}</b>
                  </span>
                </div>
                {kitErrors.length > 0 && (
                  <div className="validation-errors">
                    <b>This kit needs attention</b>
                    {kitErrors.map((issue, i) => (
                      <p key={i}>{issue.text}</p>
                    ))}
                  </div>
                )}
                {priceNotices.length > 0 && (
                  <div className="best-guess-notice" role="status">
                    <strong>Best guess</strong>
                    {priceNotices.map((issue, i) => (
                      <p key={i}>{issue.text}</p>
                    ))}
                    <small>
                      Price checks:{" "}
                      {kit.settings.priceRules === "margin"
                        ? `${kit.settings.priceMargin}% margin`
                        : kit.settings.priceRules === "strict"
                          ? "Strict estimates"
                          : "Informational only"}
                      . The in-game check has the final say.
                    </small>
                  </div>
                )}
                {otherNotices.length > 0 && (
                  <div className="validation-notices">
                    <strong>Check before the raid</strong>
                    {otherNotices.map((issue, i) => (
                      <p key={i}>{issue.text}</p>
                    ))}
                  </div>
                )}
                {attachmentNotices.length > 0 && (
                  <div className="best-guess-notice">
                    <strong>Best guess / fit checks</strong>
                    {attachmentNotices.map((issue, i) => (
                      <p key={i}>{issue.text}</p>
                    ))}
                  </div>
                )}
                {issues.length === 0 && (
                  <p className="validation-ok">
                    <Check size={14} /> Passes the checks available in this
                    snapshot. Review the data coverage before entering a raid.
                  </p>
                )}
                {kit.notices.map((text) => (
                  <p className="packing-note" key={text}>
                    {text}
                  </p>
                ))}
              </>
            )}
          </div>
        )}
        <div
          className={`status-message ${error ? "error" : ""}`}
          role={error ? "alert" : "status"}
        >
          {message}
        </div>
      </main>
      <footer className="footer">
        <span>
          Community project. Not affiliated with MoreFun Studios. All prices are
          approximate (~), not exact.
        </span>
        <span>
          Snapshot {dataVersion}{" "}
          <button onClick={() => setPanel("credits")}>
            Sources and credits
          </button>
        </span>
      </footer>
      <div className="rollbar">
        <button
          className="dock-checklist"
          onClick={() => setDrawer(!drawer)}
          aria-expanded={drawer}
        >
          <ClipboardList size={16} />
          <span>List</span>
          <span className="dock-count">
            {kit?.checked.filter((x) => allRows.some((r) => r.key === x))
              .length ?? 0}
            /{allRows.length}
          </span>
        </button>
        <button
          className="roll-button"
          disabled={busy}
          onClick={() => void randomize()}
        >
          <Shuffle size={23} />
          <b>{kit && remaining ? "Reveal the rest" : "Randomize"}</b>
        </button>
        {busy && (
          <button
            className="skip"
            onClick={() => {
              skip.current = true;
            }}
          >
            Skip animation
          </button>
        )}
        {kits.length > 1 && !busy && (
          <button className="skip" onClick={() => void randomizeSquad()}>
            Randomize squad
          </button>
        )}
      </div>
      {drawer && (
        <aside className="packing-drawer" aria-label="Packing checklist">
          <div className="paper">
            <button
              className="drawer-close"
              onClick={() => setDrawer(false)}
              aria-label="Close packing list"
            >
              <X size={16} />
            </button>
            <div className="paper-top">
              <div>
                <h2>PACKING LIST</h2>
                <small>Player {player + 1}</small>
              </div>
              <span className="count">
                {kit?.checked.filter((x) => allRows.some((r) => r.key === x))
                  .length ?? 0}{" "}
                checked
              </span>
            </div>
            {allRows.length ? (
              allRows.map((row) => (
                <div key={row.key}>
                  <label className="paper-row">
                    <input
                      type="checkbox"
                      checked={kit!.checked.includes(row.key)}
                      onChange={() => toggleCheck(row.key)}
                    />
                    <ItemIcon id={row.id} />
                    <span className="row-name">
                      {itemLabel(row.id)}
                      {row.quantity > 1 && ` x${row.quantity}`}
                      {row.ammoId && (
                        <small className="loaded-ammo-label">
                          {`${row.rounds} rounds / ${itemLabel(row.ammoId)}`}
                        </small>
                      )}
                    </span>
                    <span className="price">{row.priceText}</span>
                  </label>
                  {row.node?.children.map((child, index) => (
                    <label className="paper-row child-row" key={index}>
                      <input
                        type="checkbox"
                        checked={kit!.checked.includes(
                          `${row.key}/part/${child.id}`,
                        )}
                        onChange={() =>
                          toggleCheck(`${row.key}/part/${child.id}`)
                        }
                      />
                      <ItemIcon id={child.id} />
                      <span className="row-name">
                        {itemLabel(child.id)}
                        {child.rounds && (
                          <small>
                            {" "}
                            / {child.rounds} {itemLabel(child.ammoId!)}
                          </small>
                        )}
                      </span>
                      <span className="price">{itemPrice(child)}</span>
                    </label>
                  ))}
                </div>
              ))
            ) : (
              <p className="paper-note">Open a case to start your list.</p>
            )}
            <p className="paper-note">
              G on a magazine means it belongs in the gun after entry. Costs are
              approximate (~), not exact.
            </p>
          </div>
        </aside>
      )}
      {panel && (
        <Modal
          title={titles[panel]}
          wide={["settings", "catalog", "credits", "library", "share"].includes(
            panel,
          )}
          onClose={() => setPanel(null)}
        >
          {message && (
            <p
              className={error ? "modal-message error" : "modal-message"}
              role={error ? "alert" : "status"}
            >
              {message}
            </p>
          )}
          {panel === "mastery" && kit?.mastery && (
            <div>
              <p>
                {Object.values(kit.mastery.skills).reduce((a, b) => a + b, 0)}{" "}
                of {kit.settings.masteryPoints} points allocated. Lock
                individual skills to keep their ranks on the next roll.
              </p>
              {Object.entries(kit.mastery.skills).map(([id, rank]) => {
                const skill = skills.find((s) => s.id === id);
                const locked = kit.mastery!.locks.includes(id);
                return (
                  <div className="mastery-row" key={id}>
                    <div>
                      <strong>
                        {skill?.name ?? id} / Rank {rank}
                      </strong>
                      <p>{skill?.hint}</p>
                    </div>
                    <button
                      disabled={kit.locked || kit.mastery!.locked}
                      onClick={() =>
                        setKit({
                          ...kit,
                          mastery: {
                            ...kit.mastery!,
                            locks: locked
                              ? kit.mastery!.locks.filter((x) => x !== id)
                              : [...kit.mastery!.locks, id],
                          },
                        })
                      }
                    >
                      {locked ? <Lock size={14} /> : <Unlock size={14} />}{" "}
                      {locked ? "Unlock" : "Lock"}
                    </button>
                  </div>
                );
              })}
              <p>
                Core:{" "}
                {coreSkills.find((s) => s.id === kit.mastery!.core)?.name ??
                  "None"}
              </p>
              <div className="button-row">
                <button
                  disabled={kit.locked || kit.mastery.locked}
                  onClick={() => void rerollMastery()}
                >
                  Reroll mastery
                </button>
                <button
                  disabled={kit.locked}
                  onClick={() =>
                    setKit({
                      ...kit,
                      mastery: {
                        ...kit.mastery!,
                        locked: !kit.mastery!.locked,
                      },
                    })
                  }
                >
                  {kit.mastery.locked ? "Unlock allocation" : "Lock allocation"}
                </button>
              </div>
              <footer className="source-links">
                <a href={masterySource} target="_blank" rel="noreferrer">
                  Skill reference
                </a>
                <a href={modeSource} target="_blank" rel="noreferrer">
                  Season 7 changes and core rules
                </a>
              </footer>
            </div>
          )}
          {panel === "settings" && (
            <Settings
              value={config}
              onChange={updateConfig}
              library={library}
              onLibrary={setLibrary}
            />
          )}
          {panel === "credits" && (
            <div className="credits">
              <h3>What is in this build?</h3>
              <p>
                The local catalog contains {catalog.length.toLocaleString()}{" "}
                items and {catalog.filter((i) => i.compartments).length} storage
                layouts. Icons and data load from this site's own files.
              </p>
              <p>
                The gun pool contains {weaponPlans.length} combat firearms. Four
                profiles use curated source descriptions; the remaining profiles
                infer parts from weapon tags, platform names, and item
                descriptions. All unverified assemblies carry a Best guess mark.
                Turning attachment randomization off selects fixed basic parts,
                including required support parts. Those basic builds can also
                contain inferred choices. Check them in Gunsmith before buying.
              </p>
              <p>
                Face shields and external headsets use published pairing and
                hearing data. Gas masks use conservative coverage rules and are
                marked Best guess. Secure Ops and Solo Ops remain excluded
                because their active rotations are not confirmed. AX50, AR-30,
                and DBR remain catalog-only until availability is confirmed.
                Verified weapon attachment coverage is pending. Normal mastery
                follows the 18-skill list with the published Season 7 changes.
                Core unlocks must be selected by the player. They are not
                silently approximated. Some catalog records may describe
                unreleased items; only selected categories are eligible for
                generation.
              </p>
              <p>
                Mode caps use the{" "}
                <a href={modeSource} target="_blank" rel="noreferrer">
                  Season 7 announcement
                </a>
                . Normal on Farm and Valley has a 300,000 ceiling. Lockdown uses
                a 150,000 floor and 900,000 ceiling; Forbidden uses a 450,000
                floor on the enabled maps. Map availability excludes the
                seasonal replacements. Ticket fees are reference estimates.
                Prices are not live market quotes.
              </p>
              <p>
                Local caching permission was supplied by the project owner.
                Automated source updates remain off until separately authorized.
                Report missing or incorrect data to the project maintainer.
              </p>
              {sources.map((s) => (
                <section key={s.name}>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.name} <ExternalLink size={12} />
                  </a>
                  <p>{s.note}</p>
                </section>
              ))}
              <section>
                <h3>Mode rule references</h3>
                {modeSources.map((source) => (
                  <p key={source.url}>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.name}
                    </a>
                  </p>
                ))}
              </section>
              <section>
                <h3>Wearable rule references</h3>
                {wearableSources.map((url) => (
                  <p key={url}>
                    <a href={url} target="_blank" rel="noreferrer">
                      {url.includes("github")
                        ? "Helmet and mask pairing tables"
                        : "Face coverings reference"}
                    </a>
                  </p>
                ))}
              </section>
              <section>
                <h3>Code license, libraries, and typefaces</h3>
                <p>
                  Project code uses GPL v3 only. Game artwork, cached community
                  data, fonts, and third-party software retain their own terms.
                </p>
                <div className="button-row">
                  <a
                    href={asset("notices/GPL-3.0.txt")}
                    target="_blank"
                    rel="noreferrer"
                  >
                    GPL v3
                  </a>
                  <a
                    href={asset("notices/LICENSING.md")}
                    target="_blank"
                    rel="noreferrer"
                  >
                    License scope
                  </a>
                  <a
                    href={asset("notices/software.txt")}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Software licenses
                  </a>
                  <a
                    href={asset("notices/ABIDB-LICENSE.txt")}
                    target="_blank"
                    rel="noreferrer"
                  >
                    ABIDB license
                  </a>
                  <a
                    href={asset("assets/kenney-sound-license.txt")}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Sound license
                  </a>
                  <a
                    href={asset("data/manifest.json")}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Snapshot provenance
                  </a>
                  <a
                    href={asset("data/catalog.json")}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Local catalog record
                  </a>
                </div>
                <p>
                  React, Vite, TypeScript, three.js, Lucide, LZ-String,
                  html-to-image, and Vitest. Barlow and Barlow Condensed by
                  Jeremy Tribby, SIL Open Font License. Dependency notices are
                  included with the project.
                </p>
              </section>
            </div>
          )}
          {panel === "catalog" && (
            <div>
              <p>
                Browse the snapshot, open a source, or adjust the pool. A
                catalog entry does not mean its attachment relationships are
                ready for generation.
              </p>
              <div className="catalog-controls">
                <input
                  aria-label="Search items"
                  placeholder="Find a gun, part, or piece of gear"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <select
                  aria-label="Item category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="all">All categories</option>
                  {[...new Set(catalog.map((i) => i.category))]
                    .sort()
                    .map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                </select>
              </div>
              <div className="catalog-grid">
                {catalog
                  .filter(
                    (i) =>
                      (category === "all" || i.category === category) &&
                      i.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .slice(0, 150)
                  .map((i) => (
                    <div className="catalog-item" key={i.id}>
                      <button
                        onClick={() => {
                          setDetail({ id: i.id });
                          setPanel("details");
                        }}
                      >
                        <ItemIcon id={i.id} />
                        <span>{itemLabel(i.id)}</span>
                      </button>
                      <small>
                        {i.category} / {estimatedPrice(i.price)} Koen
                        {i.kind === "ammo" ? " / round" : ""}
                      </small>
                      <div className="weight-row">
                        <label>
                          <input
                            type="checkbox"
                            checked={!config.excluded.includes(i.id)}
                            onChange={(e) =>
                              updateConfig({
                                ...config,
                                excluded: e.target.checked
                                  ? config.excluded.filter((id) => id !== i.id)
                                  : [...config.excluded, i.id],
                              })
                            }
                          />
                          Include
                        </label>
                        <input
                          aria-label={`${i.name} weight`}
                          type="number"
                          min="0"
                          max="100"
                          value={config.weights[i.id] ?? 1}
                          onChange={(e) =>
                            updateConfig({
                              ...config,
                              weights: {
                                ...config.weights,
                                [i.id]: Math.max(
                                  0,
                                  Math.min(100, Number(e.target.value)),
                                ),
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  ))}
              </div>
              <p className="muted">
                Showing up to 150 matches. Search or select a category to narrow
                the list. Weight 1 gives equal odds; 0 excludes an item.
              </p>
            </div>
          )}
          {panel === "library" && (
            <div>
              <div className="button-row">
                <button
                  className={libraryView === "saved" ? "active" : ""}
                  onClick={() => setLibraryView("saved")}
                >
                  Saved loadouts
                </button>
                <button
                  className={libraryView === "history" ? "active" : ""}
                  onClick={() => setLibraryView("history")}
                >
                  History ({library.history.length})
                </button>
                <button
                  onClick={() =>
                    download(
                      "abi-armory-backup.json",
                      JSON.stringify(library, null, 2),
                    )
                  }
                >
                  Export backup
                </button>
                <label className="file-button">
                  Import backup or kit
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      try {
                        if (f.size > 8000000)
                          throw new Error("The backup is too large.");
                        const text = await f.text();
                        const input = JSON.parse(text);
                        if (
                          input &&
                          typeof input === "object" &&
                          Array.isArray(input.kits)
                        ) {
                          const result = parseLoadout(text);
                          reload(result.kits);
                          setShared(true);
                          tell("Imported kit opened as a temporary profile.");
                          return;
                        }
                        const next = parseBackup(text);
                        if (
                          confirm(
                            "Replace your local library and saved settings with this backup?",
                          )
                        ) {
                          setLibrary(next);
                          tell("Backup imported.");
                        }
                      } catch (error) {
                        tell((error as Error).message, true);
                      }
                    }}
                  />
                </label>
              </div>
              {recoveryBackup() && (
                <button
                  onClick={() =>
                    download("abi-recovery.json", recoveryBackup()!)
                  }
                >
                  Export preserved recovery file
                </button>
              )}
              <p className="muted">
                Saved in this browser. Export a backup before clearing browser
                data or switching devices.
              </p>
              {library[libraryView].length === 0 ? (
                <p>No loadouts here yet. Roll one and save it.</p>
              ) : (
                library[libraryView]
                  .toSorted((a, b) => Number(b.favorite) - Number(a.favorite))
                  .map((entry) => (
                    <article className="library-entry" key={entry.id}>
                      <div>
                        <h3>{entry.name}</h3>
                        <small>
                          {new Date(entry.date).toLocaleString()} /{" "}
                          {entry.kits.length} player
                          {entry.kits.length === 1 ? "" : "s"}
                        </small>
                      </div>
                      <div className="button-row">
                        <button onClick={() => reload(entry.kits)}>Load</button>
                        <button
                          onClick={() =>
                            setLibrary((old) => ({
                              ...old,
                              [libraryView]: old[libraryView].map((x) =>
                                x.id === entry.id
                                  ? { ...x, favorite: !x.favorite }
                                  : x,
                              ),
                            }))
                          }
                        >
                          {entry.favorite ? "Favorited" : "Favorite"}
                        </button>
                        {libraryView === "saved" && (
                          <button
                            onClick={() => {
                              const name = prompt("Rename loadout", entry.name);
                              if (name?.trim())
                                setLibrary((old) => ({
                                  ...old,
                                  saved: old.saved.map((x) =>
                                    x.id === entry.id
                                      ? { ...x, name: name.trim() }
                                      : x,
                                  ),
                                }));
                            }}
                          >
                            Rename
                          </button>
                        )}
                        <button
                          onClick={() =>
                            setLibrary((old) => ({
                              ...old,
                              [libraryView]: old[libraryView].filter(
                                (x) => x.id !== entry.id,
                              ),
                            }))
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))
              )}
            </div>
          )}
          {panel === "share" && (
            <div>
              <p>
                Share the exact items, attachments, quantities, packing, locks,
                and settings. Opening a shared link leaves the recipient's
                defaults alone.
              </p>
              <label>
                Export
                <select
                  value={shareScope}
                  onChange={(e) =>
                    setShareScope(e.target.value as typeof shareScope)
                  }
                >
                  <option value="player">This player</option>
                  <option value="squad">Entire squad</option>
                </select>
              </label>
              <textarea
                aria-label="Share link"
                value={
                  shareReady
                    ? (shortURL ?? shareURL)
                    : "Open every case in the selected kits before exporting."
                }
                readOnly
                rows={3}
              />
              {shareReady && (
                <>
                  <p className="muted">
                    {shortening
                      ? "Creating a short redirect..."
                      : shortURL
                        ? `${shortURL.length} characters / redirects to the exact kit`
                        : `${shareURL.length.toLocaleString()} characters in the full link`}
                  </p>
                  {shortError && <p className="callout">{shortError}</p>}
                  <details className="full-link">
                    <summary>Full link and service details</summary>
                    <textarea
                      aria-label="Full loadout link"
                      readOnly
                      value={shareURL}
                      rows={3}
                    />
                    <button onClick={() => void copy(shareURL)}>
                      Copy full link
                    </button>
                    <p className="muted">
                      Short links are created by is.gd when you open Share. The
                      full kit link is sent to that service and its redirect is
                      cached in this browser. No account or API key is needed.
                    </p>
                  </details>
                </>
              )}
              <div className="button-row">
                <button
                  disabled={!shareReady || shortening}
                  onClick={() => void copy(shortURL ?? shareURL)}
                >
                  <Share2 size={15} />{" "}
                  {shortening
                    ? "Creating short link..."
                    : shortURL
                      ? "Copy short link"
                      : "Copy link"}
                </button>
                <button
                  disabled={!shareReady}
                  onClick={() => void copy(entryText(shareKits))}
                >
                  Copy list
                </button>
                <button
                  onClick={() =>
                    download(
                      "abi-loadout.txt",
                      entryText(shareKits),
                      "text/plain",
                    )
                  }
                >
                  Download list
                </button>
                <button
                  disabled={!shareReady || exporting}
                  onClick={() => void imageExport()}
                >
                  <Download size={15} />{" "}
                  {exporting ? "Creating image..." : "Create image"}
                </button>
                <button
                  onClick={() =>
                    download(
                      "abi-loadout.json",
                      JSON.stringify({
                        version: 1,
                        kits: shareKits,
                        settings: config,
                      }),
                    )
                  }
                >
                  Download data
                </button>
              </div>
              {exportedImage && (
                <figure className="export-preview">
                  <img src={exportedImage} alt="Exported loadout image" />
                  <figcaption>
                    <a href={exportedImage} download="abi-loadout.png">
                      Download PNG
                    </a>
                    <span>You can also save the preview image directly.</span>
                  </figcaption>
                </figure>
              )}
              <div id="share-image">
                <ExportCard kits={shareKits} playerNumber={player + 1} />
              </div>
            </div>
          )}
          {panel === "details" && selected && (
            <div className="item-detail">
              <div className="item-overview">
                <ItemIcon id={selected.id} />
                <div>
                  <p>
                    {selected.category}
                    {selected.tier !== undefined
                      ? ` / Tier ${selected.tier}`
                      : ""}
                  </p>
                  <p>
                    {selected.priceKnown === false
                      ? "Price unavailable"
                      : `${estimatedPrice(selected.price)} Koen`}
                    {selected.kind === "ammo" ? " per round" : ""} (approx.)
                  </p>
                  <p>
                    {selected.weight} kg / {selected.size.join(" x ")} slots
                  </p>
                </div>
              </div>
              <p>{selected.description}</p>
              {wearableRules[selected.id]?.builtInAudio && (
                <p className="callout">
                  Built-in audio. An external headset is not added with this
                  helmet.
                </p>
              )}
              {allWeaponPlans.find((p) => p.id === selected.id)
                ?.availability && (
                <p className="callout">
                  Availability unconfirmed. This weapon stays in the catalog for
                  reference and is excluded from automatic rolls.
                </p>
              )}
              {detail?.slot && kit?.gear[detail.slot]?.rounds && (
                <p className="callout">
                  Loaded internally: {kit.gear[detail.slot]!.rounds} rounds of{" "}
                  {itemLabel(kit.gear[detail.slot]!.ammoId!)}.
                </p>
              )}
              {selected.kind === "weapon" &&
                weaponPlans.find((p) => p.id === selected.id) && (
                  <p className="best-guess-notice">
                    <strong>Best guess / attachment fit</strong>
                    {weaponPlans.find((p) => p.id === selected.id)?.basis ??
                      "This assembly uses source descriptions and has not been checked in game."}{" "}
                    {kit?.settings.randomizeAttachments === false
                      ? "Attachment rolls are off. This is the basic build."
                      : ""}
                  </p>
                )}
              {detail?.uid &&
                kit?.supplies.find((s) => s.uid === detail.uid)?.ammoId && (
                  <p className="callout">
                    Loaded:{" "}
                    {kit.supplies.find((s) => s.uid === detail.uid)?.rounds}{" "}
                    rounds of{" "}
                    {itemLabel(
                      kit.supplies.find((s) => s.uid === detail.uid)!.ammoId!,
                    )}
                    .
                  </p>
                )}
              {detail?.uid &&
                kit?.supplies.find((x) => x.uid === detail.uid)?.role ===
                  "gun-mag" && (
                  <p className="callout">
                    This is the designated gun magazine. Put it in the gun after
                    entering the raid. It is packed here so its value is
                    excluded from the entry estimate.
                  </p>
                )}
              {detail?.slot && kit?.gear[detail.slot]?.children.length! > 0 && (
                <>
                  <h3>Attachment slots</h3>
                  <p className="setting-note">
                    Locked parts stay in place. Supporting parts{" "}
                    {kit!.settings.supportingParts === "manual"
                      ? "stay in place too; changes that need other parts will explain what to change"
                      : "change automatically when needed"}
                    .
                  </p>
                  {weaponPlans
                    .find((p) => p.id === selected.id)
                    ?.parts.map((part) => {
                      const gun = kit!.gear[detail.slot!]!,
                        child = gun.children.find((c) =>
                          part.ids.includes(c.id),
                        ),
                        locked = !!child && !!gun.partLocks?.includes(child.id);
                      return (
                        <div className="attachment-row" key={part.slot}>
                          <label>
                            {part.slot}
                            <select
                              aria-label={part.slot + " attachment"}
                              disabled={
                                kit!.locked ||
                                kit!.locks.includes(detail.slot!) ||
                                locked
                              }
                              value={child?.id ?? ""}
                              onChange={(e) =>
                                void changePart(part.slot, e.target.value)
                              }
                            >
                              {part.optional && <option value="">None</option>}
                              {part.ids.map((id) => (
                                <option key={id} value={id}>
                                  {byId[id]?.name ?? id}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            aria-label={"Reroll " + part.slot}
                            disabled={
                              locked ||
                              kit!.locked ||
                              kit!.locks.includes(detail.slot!)
                            }
                            onClick={() => void changePart(part.slot)}
                          >
                            <RotateCcw size={14} />
                          </button>
                          <button
                            aria-label={
                              (locked ? "Unlock " : "Lock ") + part.slot
                            }
                            disabled={
                              !child ||
                              kit!.locked ||
                              kit!.locks.includes(detail.slot!)
                            }
                            onClick={() => {
                              const next = structuredClone(kit!);
                              const node = next.gear[detail.slot!]!;
                              node.partLocks = locked
                                ? (node.partLocks ?? []).filter(
                                    (id) => id !== child!.id,
                                  )
                                : [...(node.partLocks ?? []), child!.id];
                              setKit(next);
                            }}
                          >
                            {locked ? <Lock size={14} /> : <Unlock size={14} />}
                          </button>
                        </div>
                      );
                    })}
                  <h3>Installed parts</h3>
                  {kit!.gear[detail.slot]!.children.map((node, i) => (
                    <button
                      className="detail-part"
                      key={i}
                      onClick={() => {
                        setDetail({ id: node.id });
                      }}
                    >
                      <ItemIcon id={node.id} />
                      <span>{byId[node.id]?.name ?? node.id}</span>
                      <small>{estimatedPrice(byId[node.id]?.price ?? 0)}</small>
                    </button>
                  ))}
                </>
              )}
              {selected.compartments && (
                <p>
                  Compartments:{" "}
                  {selected.compartments.map((s) => s.join(" x ")).join(", ")}
                </p>
              )}
              <details>
                <summary>Stats from the snapshot</summary>
                <dl>
                  {selected.stats.map((stat, i) => (
                    <div key={i}>
                      <dt>{stat.key}</dt>
                      <dd>
                        {String(stat.value)} {stat.unit}
                      </dd>
                    </div>
                  ))}
                </dl>
              </details>
              {detail?.uid && kit && (
                <section>
                  <h3>Move this item</h3>
                  <div className="setting-columns">
                    <label>
                      Compartment
                      <select
                        value={editContainer}
                        onChange={(e) => setEditContainer(e.target.value)}
                      >
                        {compartments(kit).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.id.startsWith("secure")
                              ? "Basic secure case"
                              : c.id.startsWith("pocket")
                                ? "Pocket " + (Number(c.id.split(":")[1]) + 1)
                                : (labels[c.id.split(":")[0] as Slot] ??
                                    "Storage") +
                                  " / compartment " +
                                  (Number(c.id.split(":")[1]) + 1)}{" "}
                            ({c.size.join(" x ")})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Column
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={editX + 1}
                        onChange={(e) => setEditX(Number(e.target.value) - 1)}
                      />
                    </label>
                    <label>
                      Row
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={editY + 1}
                        onChange={(e) => setEditY(Number(e.target.value) - 1)}
                      />
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={editRotate}
                        onChange={(e) => setEditRotate(e.target.checked)}
                      />
                      Rotate
                    </label>
                  </div>
                  <button disabled={kit.locked} onClick={repackMove}>
                    Move item
                  </button>
                </section>
              )}
              {(detail?.slot || detail?.uid) && (
                <section>
                  <h3>Choose a different item</h3>
                  <div className="button-row">
                    <select
                      aria-label="Replacement item"
                      value={swapId}
                      onChange={(e) => setSwapId(e.target.value)}
                    >
                      {catalog
                        .filter(
                          (i) =>
                            i.category === selected.category &&
                            (i.kind !== "weapon" ||
                              weaponPlans.some((plan) => plan.id === i.id)),
                        )
                        .map((i) => (
                          <option value={i.id} key={i.id}>
                            {i.name}
                          </option>
                        ))}
                    </select>
                    <button onClick={swap}>Preview swap</button>
                  </div>
                  <p className="muted">
                    A swap that breaks packing or raid rules will warn before it
                    is kept.
                  </p>
                </section>
              )}
              <footer className="source-links">
                <a href={selected.wiki} target="_blank" rel="noreferrer">
                  Wiki reference <ExternalLink size={12} />
                </a>
                {["helmet", "headset", "face", "gasMask"].includes(
                  selected.category,
                ) &&
                  wearableSources.map((url, i) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      Wearable source {i + 1}
                    </a>
                  ))}
                <a
                  href="https://abi-tracker.azurewebsites.net/?lang=en"
                  target="_blank"
                  rel="noreferrer"
                >
                  Snapshot source <ExternalLink size={12} />
                </a>
                <span>
                  Item {selected.id} / {dataVersion}
                </span>
                {weaponPlans
                  .find((plan) => plan.id === selected.id)
                  ?.sources.map((url, index) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      Assembly source {index + 1} <ExternalLink size={12} />
                    </a>
                  ))}
              </footer>
            </div>
          )}
          {panel === "challenges" && (
            <div>
              <p>
                Optional rules for a run. Your regular randomizer settings stay
                available in your configurations.
              </p>
              <div className="button-row">
                {[
                  {
                    name: "Sidearm night",
                    settings: { sidearmOnly: true, secondChance: 0 },
                  },
                  {
                    name: "Travel light",
                    settings: { grenades: 0, food: 0, drinks: 0 },
                  },
                  {
                    name: "Bare necessities",
                    settings: {
                      attachmentDensity: "bare" as const,
                      secondChance: 0,
                      extraMeds: 0,
                    },
                  },
                ].map((c) => (
                  <button
                    key={c.name}
                    onClick={() => {
                      updateConfig({ ...config, ...c.settings });
                      setPanel(null);
                      tell(
                        `${c.name} settings applied. Press Randomize when you are ready.`,
                      );
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              <section>
                <h3>Make a challenge</h3>
                <p>Save the current player's settings with your own goals.</p>
                <label>
                  Name
                  <input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    maxLength={100}
                  />
                </label>
                <label>
                  Goals and rules
                  <textarea
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    maxLength={3000}
                  />
                </label>
                <h3>After a raid</h3>
                <p className="muted">
                  Rules change settings after you record a win or loss. They
                  never roll a kit automatically.
                </p>
                {challengeRules.map((rule, index) => (
                  <div className="challenge-rule" key={index}>
                    <select
                      aria-label={"Rule " + (index + 1) + " outcome"}
                      value={rule.when}
                      onChange={(e) =>
                        setChallengeRules((old) =>
                          old.map((r, i) =>
                            i === index
                              ? {
                                  ...r,
                                  when: e.target.value as ChallengeRule["when"],
                                }
                              : r,
                          ),
                        )
                      }
                    >
                      <option value="win">On a win</option>
                      <option value="loss">On a loss</option>
                    </select>
                    <select
                      aria-label={"Rule " + (index + 1) + " setting"}
                      value={rule.field}
                      onChange={(e) =>
                        setChallengeRules((old) =>
                          old.map((r, i) =>
                            i === index
                              ? {
                                  ...r,
                                  field: e.target
                                    .value as ChallengeRule["field"],
                                }
                              : r,
                          ),
                        )
                      }
                    >
                      <option value="primaryChance">Primary chance</option>
                      <option value="secondChance">Second gun chance</option>
                      <option value="budget">Budget</option>
                      <option value="grenades">Grenade maximum</option>
                      <option value="looseRounds">Loose ammo rounds</option>
                    </select>
                    <select
                      aria-label={"Rule " + (index + 1) + " operation"}
                      value={rule.operation}
                      onChange={(e) =>
                        setChallengeRules((old) =>
                          old.map((r, i) =>
                            i === index
                              ? {
                                  ...r,
                                  operation: e.target
                                    .value as ChallengeRule["operation"],
                                }
                              : r,
                          ),
                        )
                      }
                    >
                      <option value="add">Change by</option>
                      <option value="set">Set to</option>
                    </select>
                    <input
                      aria-label={"Rule " + (index + 1) + " amount"}
                      type="number"
                      min="-10000000"
                      max="10000000"
                      value={rule.value}
                      onChange={(e) =>
                        setChallengeRules((old) =>
                          old.map((r, i) =>
                            i === index
                              ? { ...r, value: Number(e.target.value) }
                              : r,
                          ),
                        )
                      }
                    />
                    <button
                      aria-label={"Remove rule " + (index + 1)}
                      onClick={() =>
                        setChallengeRules((old) =>
                          old.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
                <div className="button-row">
                  <button
                    disabled={challengeRules.length >= 20}
                    onClick={() =>
                      setChallengeRules((old) => [
                        ...old,
                        {
                          when: "win",
                          field: "primaryChance",
                          operation: "add",
                          value: -5,
                        },
                      ])
                    }
                  >
                    Add outcome rule
                  </button>
                </div>
                <br />
                <button
                  disabled={!customName.trim()}
                  onClick={() => {
                    setLibrary((old) => ({
                      ...old,
                      challenges: [
                        ...old.challenges,
                        {
                          id: newSeed(),
                          name: customName.trim(),
                          notes: customNotes,
                          wins: 0,
                          losses: 0,
                          streak: 0,
                          rules: structuredClone(challengeRules),
                          settings: structuredClone(config),
                        },
                      ],
                    }));
                    setCustomName("");
                    setCustomNotes("");
                    setChallengeRules([]);
                  }}
                >
                  Save challenge
                </button>
              </section>
              {library.challenges.map((c) => (
                <article className="library-entry" key={c.id}>
                  <div>
                    <h3>{c.name}</h3>
                    <p>{c.notes}</p>
                    <small>
                      {c.wins} wins / {c.losses} losses / {c.streak ?? 0} win
                      streak
                    </small>
                  </div>
                  <div className="button-row">
                    <button
                      onClick={() => {
                        updateConfig(c.settings);
                        setPanel(null);
                        tell(
                          "Challenge settings loaded. Press Randomize to start.",
                        );
                      }}
                    >
                      Use settings
                    </button>
                    <button onClick={() => recordOutcome(c, "win")}>Win</button>
                    <button onClick={() => recordOutcome(c, "loss")}>
                      Loss
                    </button>
                    <button
                      onClick={() =>
                        setLibrary((old) => ({
                          ...old,
                          challenges: old.challenges.filter(
                            (x) => x.id !== c.id,
                          ),
                        }))
                      }
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
