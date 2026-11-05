import { catalog, byId, maps, modes, money, weaponPlans } from "./catalog";
import {
  slots,
  type Library,
  type Settings as Config,
  type Slot,
} from "./types";
import { coreSkills, skills } from "./mastery";
export const labels: Record<Slot, string> = {
  helmet: "Helmet",
  armor: "Armor",
  rig: "Chest rig",
  bag: "Backpack",
  gun: "First gun",
  second: "Second gun",
  headset: "Headset",
  face: "Face protection",
};
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
export default function Settings({
  value,
  onChange,
  library,
  onLibrary,
}: {
  value: Config;
  onChange: (s: Config) => void;
  library: Library;
  onLibrary: (l: Library) => void;
}) {
  const set = <K extends keyof Config>(key: K, v: Config[K]) =>
    onChange({ ...value, [key]: v });
  const toggle = (key: keyof Config, label: string, hint?: string) => (
    <label className="setting-check">
      <input
        type="checkbox"
        checked={!!value[key]}
        onChange={(e) => set(key, e.target.checked as never)}
      />
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
  const number = (
    key: keyof Config,
    label: string,
    min: number,
    max: number,
    step = 1,
  ) => (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number(value[key])}
        onChange={(e) =>
          set(
            key,
            Math.min(max, Math.max(min, Number(e.target.value))) as never,
          )
        }
      />
    </label>
  );
  return (
    <div className="settings-content">
      <section>
        <h3>Your configurations</h3>
        <p>Keep a few setups ready for different nights.</p>
        <div className="button-row">
          <select
            aria-label="Load a preset"
            defaultValue=""
            onChange={(e) => {
              const p = library.presets.find((p) => p.id === e.target.value);
              if (p) onChange(structuredClone(p.settings));
              e.target.value = "";
            }}
          >
            <option value="">Load a configuration</option>
            {library.presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              const name = prompt(
                "Configuration name",
                `Config ${library.presets.length + 1}`,
              );
              if (name?.trim())
                onLibrary({
                  ...library,
                  presets: [
                    ...library.presets,
                    {
                      id: crypto.randomUUID(),
                      name: name.trim().slice(0, 100),
                      settings: structuredClone(value),
                    },
                  ],
                });
            }}
          >
            Save configuration
          </button>
        </div>
        {library.presets.map((p) => (
          <div className="preset-row" key={p.id}>
            <span>{p.name}</span>
            <button
              onClick={() => {
                const name = prompt("Rename configuration", p.name);
                if (name?.trim())
                  onLibrary({
                    ...library,
                    presets: library.presets.map((x) =>
                      x.id === p.id
                        ? { ...x, name: name.trim().slice(0, 100) }
                        : x,
                    ),
                  });
              }}
            >
              Rename
            </button>
            <button
              onClick={() =>
                onLibrary({
                  ...library,
                  presets: [
                    ...library.presets,
                    {
                      ...structuredClone(p),
                      id: crypto.randomUUID(),
                      name: p.name + " copy",
                    },
                  ],
                })
              }
            >
              Duplicate
            </button>
            <button
              onClick={() =>
                onLibrary({
                  ...library,
                  presets: library.presets.filter((x) => x.id !== p.id),
                })
              }
            >
              Delete
            </button>
          </div>
        ))}
      </section>
      <section>
        <h3>What should roll?</h3>
        <p>Turn a category off to bring your own item, or leave it empty.</p>
        <div className="category-settings">
          {slots.map((slot) => (
            <div className="category-row" key={slot}>
              <label>
                <input
                  type="checkbox"
                  checked={value.categories[slot]}
                  onChange={(e) =>
                    set("categories", {
                      ...value.categories,
                      [slot]: e.target.checked,
                    })
                  }
                />
                {labels[slot]}
              </label>
              {!value.categories[slot] && (
                <select
                  aria-label={`Fixed ${labels[slot]}`}
                  value={value.fixed[slot] ?? ""}
                  onChange={(e) =>
                    set("fixed", { ...value.fixed, [slot]: e.target.value })
                  }
                >
                  <option value="">None</option>
                  {catalog
                    .filter(
                      (i) =>
                        categories[slot].includes(i.category) &&
                        (i.kind !== "weapon" ||
                          weaponPlans.some((plan) => plan.id === i.id)),
                    )
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                </select>
              )}
            </div>
          ))}
        </div>
        {toggle(
          "saveFixed",
          "Remember my chosen items",
          "Random results still start hidden on every visit.",
        )}
        <p className="muted">
          Face shields follow the published helmet pairings. External headsets
          stay off helmets with built-in audio or incompatible coverage. Gas
          masks use a conservative open-face coverage check and carry a Best
          guess notice.
        </p>
      </section>
      <section>
        <h3>Where are we going?</h3>
        <div className="setting-columns">
          <div>
            {maps.map((map) => (
              <div className="weight-row" key={map.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={value.maps.includes(map.id)}
                    onChange={(e) =>
                      set(
                        "maps",
                        e.target.checked
                          ? [...value.maps, map.id]
                          : value.maps.filter((x) => x !== map.id),
                      )
                    }
                  />
                  {map.name}
                </label>
                <input
                  aria-label={`${map.name} weight`}
                  type="number"
                  min="0"
                  max="100"
                  value={value.mapWeights[map.id] ?? 1}
                  onChange={(e) =>
                    set("mapWeights", {
                      ...value.mapWeights,
                      [map.id]: Math.max(
                        0,
                        Math.min(100, Number(e.target.value)),
                      ),
                    })
                  }
                />
              </div>
            ))}
          </div>
          <div>
            {Object.entries(modes).map(([id, mode]) => (
              <div className="weight-row" key={id}>
                <label>
                  <input
                    type="checkbox"
                    checked={value.modes.includes(id)}
                    onChange={(e) =>
                      set(
                        "modes",
                        e.target.checked
                          ? [...value.modes, id]
                          : value.modes.filter((x) => x !== id),
                      )
                    }
                  />
                  {mode.name}
                </label>
                <input
                  aria-label={`${mode.name} weight`}
                  type="number"
                  min="0"
                  max="100"
                  value={value.modeWeights[id] ?? 1}
                  onChange={(e) =>
                    set("modeWeights", {
                      ...value.modeWeights,
                      [id]: Math.max(0, Math.min(100, Number(e.target.value))),
                    })
                  }
                />
              </div>
            ))}
            <p className="muted">
              Each map rolls first, then one of its available modes. Seasonal
              infected modes are excluded. Secure Ops and Solo Ops are pending
              current availability checks.
            </p>
          </div>
        </div>
      </section>
      <section>
        <h3>Guns and ammunition</h3>
        {toggle(
          "randomizeAttachments",
          "Randomize attachments",
          "Turn this off to use a fixed basic build on the next roll. Inferred basic builds still carry a Best guess mark.",
        )}
        <div className="setting-columns">
          {number("primaryChance", "First gun: primary chance (%)", 0, 100)}
          {number("secondChance", "Second gun chance (%)", 0, 100)}
          {number("magazines", "Total magazines per gun", 1, 8)}
          {number("looseRounds", "Loose reserve rounds per gun", 60, 600, 60)}
          <label>
            Attachments
            <select
              value={value.attachmentDensity}
              disabled={!value.randomizeAttachments}
              onChange={(e) =>
                set(
                  "attachmentDensity",
                  e.target.value as Config["attachmentDensity"],
                )
              }
            >
              <option value="bare">Only required parts</option>
              <option value="mixed">Let it get awkward</option>
              <option value="full">Fill available slots</option>
            </select>
          </label>
        </div>
        <label>
          Supporting parts
          <select
            value={value.supportingParts}
            onChange={(e) =>
              set(
                "supportingParts",
                e.target.value as Config["supportingParts"],
              )
            }
          >
            <option value="automatic">
              Change supporting parts automatically
            </option>
            <option value="manual">
              Keep parts and explain what needs changing
            </option>
          </select>
        </label>
        <p className="setting-note">
          Attachment changes keep locked parts. Automatic changes are listed
          with the kit.
        </p>
        <label>
          Ammo types
          <select
            value={value.ammoMode}
            onChange={(e) =>
              set("ammoMode", e.target.value as Config["ammoMode"])
            }
          >
            <option value="gun">One type per gun</option>
            <option value="magazine">Roll each magazine separately</option>
          </select>
        </label>
        {toggle("sidearmOnly", "Sidearm only")}
        {toggle(
          "storeGunMag",
          "Pack the designated magazine in storage",
          "Insert this magazine after entering the raid. Internal magazines stay loaded.",
        )}
        {toggle("ammo", "Include loose reserve ammunition")}
        {toggle("secureAmmo", "Allow reserve ammo in the basic secure case")}
        {toggle("avoidRepeats", "Avoid repeated guns across the squad")}
        {value.avoidRepeats &&
          toggle("repeatFallback", "Allow repeats if the pool is too small")}
      </section>
      <section>
        <h3>Supplies and storage</h3>
        {toggle("medical", "Always bring surgery, healing, and a bandage")}
        <div className="setting-columns">
          {number("grenades", "Grenades: zero up to", 0, 10)}
          {number("food", "Food: zero up to", 0, 5)}
          {number("drinks", "Drinks: zero up to", 0, 5)}
          {number("extraMeds", "Extra medical items: zero up to", 0, 5)}
          <label>
            When supplies do not fit
            <select
              value={value.packing}
              onChange={(e) =>
                set("packing", e.target.value as Config["packing"])
              }
            >
              <option value="supplies">Trim optional extras first</option>
              <option value="storage">Try different storage</option>
              <option value="reroll">Reroll unlocked gear</option>
            </select>
          </label>
        </div>
        <p className="muted">
          Medical coverage and the selected ammo reserve are never trimmed.
          Weight is shown for reference.
        </p>
      </section>
      <section>
        <h3>Spending</h3>
        <div className="setting-columns">
          <label>
            Price checks
            <select
              value={value.priceRules}
              onChange={(e) =>
                set("priceRules", e.target.value as Config["priceRules"])
              }
            >
              <option value="margin">Allow a margin (default)</option>
              <option value="strict">Strict estimates</option>
              <option value="informational">Informational only</option>
            </select>
          </label>
          {number(
            "priceMargin",
            value.priceRules === "margin"
              ? "Allowed margin (%)"
              : "Near-limit warning band (%)",
            0,
            100,
          )}
        </div>
        <p className="price-policy-copy">
          {value.priceRules === "margin"
            ? `Allow estimates up to ${value.priceMargin}% below a minimum or above a maximum. Near-limit kits are marked “Best guess.”`
            : value.priceRules === "strict"
              ? "Keep estimates inside the stated limits. Near-limit kits still get a “Best guess” notice."
              : "Price estimates never block a roll. Near-limit and out-of-range estimates are marked “Best guess.”"}
        </p>
        <p className="muted">
          Applies to mode entry values and optional purchase budgets. Ammo
          tiers, armor tiers, compatibility, and packing stay firm. The squad
          cap uses Player 1's price-check settings. Margin is a chosen
          allowance, not a measure of price accuracy.
        </p>
        <p>
          Optional. Entry value counts equipped gear; the purchase estimate also
          includes supplies.
        </p>
        <div className="setting-columns">
          {number("minBudget", "Minimum purchase estimate", 0, 10000000, 10000)}
          {number(
            "budget",
            "Maximum purchase estimate (0 = off)",
            0,
            10000000,
            10000,
          )}
          {number(
            "squadBudget",
            "Total squad purchase cap (0 = off)",
            0,
            40000000,
            10000,
          )}
        </div>
        <p className="muted">
          Reference values are snapshot estimates, not live market quotes.
          Current fixed items:{" "}
          {Object.values(value.fixed)
            .filter(Boolean)
            .map((id) => byId[id!]?.name)
            .join(", ") || "none"}
          . {value.budget > 0 && `Budget: ${money(value.budget)} Koen.`}
        </p>
      </section>
      <section>
        <h3>Mastery</h3>
        {toggle(
          "mastery",
          "Randomize normal mastery",
          "Use all available points, without optimizing for the kit.",
        )}
        {value.mastery && (
          <>
            {number("masteryPoints", "Available mastery points", 0, 12)}
            <p className="muted">
              Up to six skills, three ranks each. Uncheck skills you have not
              unlocked. Weight 1 gives each eligible skill equal odds per point.
            </p>
            <div className="setting-columns">
              {skills.map((skill) => (
                <div className="weight-row" key={skill.id}>
                  <label title={skill.hint}>
                    <input
                      type="checkbox"
                      checked={!value.masteryExcluded.includes(skill.id)}
                      onChange={(e) =>
                        set(
                          "masteryExcluded",
                          e.target.checked
                            ? value.masteryExcluded.filter(
                                (id) => id !== skill.id,
                              )
                            : [...value.masteryExcluded, skill.id],
                        )
                      }
                    />
                    {skill.name}
                  </label>
                  <input
                    aria-label={`${skill.name} mastery weight`}
                    type="number"
                    min="0"
                    max="100"
                    value={value.masteryWeights[skill.id] ?? 1}
                    onChange={(e) =>
                      set("masteryWeights", {
                        ...value.masteryWeights,
                        [skill.id]: Math.max(
                          0,
                          Math.min(100, Number(e.target.value)),
                        ),
                      })
                    }
                  />
                </div>
              ))}
            </div>
            {toggle(
              "allowCore",
              "Include Core Mastery",
              "Requires season mission unlocks. Only checked unlocks can roll.",
            )}
            {value.allowCore &&
              coreSkills.map((skill) => (
                <label className="setting-check" key={skill.id}>
                  <input
                    type="checkbox"
                    checked={value.coreUnlocked.includes(skill.id)}
                    onChange={(e) =>
                      set(
                        "coreUnlocked",
                        e.target.checked
                          ? [...value.coreUnlocked, skill.id]
                          : value.coreUnlocked.filter((id) => id !== skill.id),
                      )
                    }
                  />
                  <span>
                    {skill.name}
                    <small>{skill.hint}</small>
                  </span>
                </label>
              ))}
          </>
        )}
      </section>
      <section>
        <h3>Sound, motion, and appearance</h3>
        {toggle("sound", "Sound on")}
        <label>
          Volume{" "}
          <input
            type="range"
            min="0"
            max="100"
            value={value.volume}
            onChange={(e) => set("volume", Number(e.target.value))}
          />
        </label>
        {toggle(
          "reducedMotion",
          "Reduce motion",
          "Skips case motion and reveal effects.",
        )}
        <div className="setting-columns">
          <label>
            Reveal speed
            <select
              value={value.reveal}
              onChange={(e) =>
                set("reveal", e.target.value as Config["reveal"])
              }
            >
              <option value="full">Take your time</option>
              <option value="quick">Quick</option>
              <option value="instant">Instant</option>
            </select>
          </label>
          <label>
            Theme
            <select
              value={value.theme}
              onChange={(e) => set("theme", e.target.value as Config["theme"])}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">Follow my device</option>
            </select>
          </label>
        </div>
      </section>
    </div>
  );
}
