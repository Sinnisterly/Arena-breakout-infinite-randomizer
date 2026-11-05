import type { CSSProperties } from "react";
import { asset, byId, dataVersion, maps, modes } from "./catalog";
import { estimatedPrice, itemPrice, itemLabel } from "./presentation";
import { totals, validate, squadPriceIssues } from "./engine";
import { ItemIcon } from "./Inventory";
import { coreSkills, skills } from "./mastery";
import type { Kit, Slot } from "./types";
import "./export-card.css";

const gearLabels: Record<string, string> = {
  helmet: "Helmet",
  armor: "Armor",
  rig: "Chest rig",
  bag: "Backpack",
  headset: "Headset",
  face: "Face protection",
};
export default function ExportCard({
  kits,
  playerNumber = 1,
}: {
  kits: Kit[];
  playerNumber?: number;
}) {
  if (!kits.length) return null;
  const squad = kits.length > 1,
    first = kits[0],
    map = maps.find((m) => m.id === first.map),
    mode = modes[first.mode];
  return (
    <article
      className={`export-card ${squad ? "export-squad" : "export-solo"}`}
      style={
        {
          "--export-accent": mode?.color ?? "#dbc286",
          backgroundImage: `linear-gradient(180deg,#10181035,#101b16ed 235px),url("${asset("assets/armory-scene.png")}")`,
        } as CSSProperties
      }
    >
      <header className="export-masthead">
        <div className="export-brand">
          <img src={asset("assets/armory-insignia.png")} alt="" />
          <div>
            <span>ABI RANDOMIZER</span>
            <h2>RAID MANIFEST</h2>
          </div>
        </div>
        <div className="export-stamp">
          {squad ? "SQUAD LOADOUT" : "SOLO LOADOUT"}
          <b>
            {squad
              ? `${kits.length} PLAYERS`
              : `PLAYER ${String(playerNumber).padStart(2, "0")}`}
          </b>
        </div>
      </header>
      <div className="export-destination">
        <img
          src={asset(`assets/${map?.image ?? "map-preview-pending.svg"}`)}
          alt=""
        />
        <div>
          <small>DESTINATION</small>
          <h3>{map?.name ?? first.map}</h3>
        </div>
        <span className="export-mode">{mode?.name ?? first.mode}</span>
        <span className="export-reference">KIT / SHARECARD</span>
      </div>
      {squad && squadPriceIssues(kits, first.settings).length > 0 && (
        <div className="export-best-guess">
          <b>
            {squadPriceIssues(kits, first.settings).some(
              (i) => i.severity === "error",
            )
              ? "Outside price rules"
              : "Best guess"}{" "}
            / squad spending
          </b>
          {squadPriceIssues(kits, first.settings).map((issue, i) => (
            <p key={i}>{issue.text}</p>
          ))}
        </div>
      )}
      <div className="export-players">
        {kits.map((kit, index) => {
          const value = totals(kit),
            number = squad ? index + 1 : playerNumber;
          const priceChecks = validate(kit).filter(
            (i) =>
              i.code === "price-estimate" || i.code === "wearable-estimate",
          );
          const gear = Object.entries(kit.gear).filter(
            ([slot, node]) => node && !["gun", "second"].includes(slot),
          );
          return (
            <section className="export-player" key={kit.id}>
              <header className="export-player-head">
                <span className="export-player-number">
                  {String(number).padStart(2, "0")}
                </span>
                <h3>PLAYER {number}</h3>
                {kit.locked && <span className="export-locked">LOCKED</span>}
                <span className="export-weight">
                  {value.weight.toFixed(1)} kg
                </span>
              </header>
              <div className="export-weapons">
                {(["gun", "second"] as Slot[]).map((slot) => {
                  const gun = kit.gear[slot];
                  if (!gun) return null;
                  return (
                    <div className="export-weapon" key={slot}>
                      <div className="export-weapon-main">
                        <ItemIcon id={gun.id} />
                        <div>
                          <small>
                            {slot === "gun" ? "FIRST GUN" : "SECOND GUN"}
                          </small>
                          <h4>{byId[gun.id]?.name ?? gun.id}</h4>
                          <small className="export-attachment-guess">
                            BEST GUESS / ATTACHMENT FIT
                          </small>
                          <span>{byId[gun.id]?.caliber}</span>
                          {gun.rounds && (
                            <span className="export-loaded-ammo">
                              Loaded internally: {gun.rounds} /{" "}
                              {itemLabel(gun.ammoId!)}
                            </span>
                          )}
                          <span className="export-price-tag">
                            {itemPrice(gun)} Koen assembled
                          </span>
                        </div>
                      </div>
                      <div className="export-attachments-label">
                        <b>
                          {kit.settings.randomizeAttachments === false
                            ? "BASIC BUILD PARTS"
                            : "ATTACHMENTS"}
                        </b>
                        <small>Included in weapon estimate</small>
                      </div>
                      <ul className="export-parts">
                        {gun.children.length === 0 && (
                          <li>Standard integrated parts</li>
                        )}
                        {gun.children.map((part, i) => (
                          <li key={i}>
                            <span>
                              {itemLabel(part.id)}
                              {part.rounds
                                ? ` / ${part.rounds} rounds / ${itemLabel(part.ammoId!)}`
                                : ""}
                            </span>
                            <small className="export-price-tag">
                              {itemPrice(part)}
                            </small>
                          </li>
                        ))}
                      </ul>
                      <p className="export-fit-note">
                        {kit.settings.randomizeAttachments === false
                          ? "Fixed basic build. "
                          : ""}
                        Attachment fit is approximate. Check in Gunsmith before
                        buying.
                      </p>
                    </div>
                  );
                })}
              </div>
              <div
                className="export-equipment"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(4, gear.length) || 1},minmax(0,1fr))`,
                }}
              >
                {gear.map(([slot, node]) => (
                  <div className="export-gear-item" key={slot}>
                    <small>
                      {slot === "armor" &&
                      byId[node!.id]?.category === "armoredRig"
                        ? "Armored rig"
                        : gearLabels[slot]}
                    </small>
                    <ItemIcon id={node!.id} />
                    <span>{byId[node!.id]?.name ?? node!.id}</span>
                    <small className="export-price-tag">
                      {itemPrice(node!)}
                    </small>
                    {byId[node!.id]?.tier ? (
                      <b>T{byId[node!.id].tier}</b>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="export-supplies">
                <h4>PACKED FOR THE RAID</h4>
                <div className="export-supply-list">
                  {kit.supplies.map((item) => (
                    <div className="export-supply" key={item.uid}>
                      <ItemIcon id={item.id} />
                      <span>
                        {itemLabel(item.id)}
                        {item.quantity > 1 && <b> x{item.quantity}</b>}
                        {item.rounds && (
                          <small>
                            {`${item.rounds} rounds / ${itemLabel(item.ammoId!)}`}
                            {item.role === "gun-mag"
                              ? " / insert after entry"
                              : ""}
                          </small>
                        )}
                      </span>
                      <small className="export-price-tag">
                        {itemPrice(item)}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
              {kit.mastery && (
                <div className="export-mastery">
                  <h4>MASTERY</h4>
                  <p>
                    {Object.entries(kit.mastery.skills)
                      .map(
                        ([id, rank]) =>
                          `${skills.find((s) => s.id === id)?.name ?? id} ${rank}`,
                      )
                      .join(" / ")}
                  </p>
                  {kit.mastery.core && (
                    <p>
                      Core:{" "}
                      {coreSkills.find((s) => s.id === kit.mastery!.core)
                        ?.name ?? kit.mastery.core}
                    </p>
                  )}
                </div>
              )}
              <footer className="export-values">
                <span>
                  Entry estimate <b>{estimatedPrice(value.entry)}</b>
                </span>
                <span>
                  Purchase estimate <b>{estimatedPrice(value.purchase)}</b>
                </span>
              </footer>
              {priceChecks.length > 0 && (
                <div className="export-best-guess">
                  <b>
                    {priceChecks.some((i) => i.severity === "error")
                      ? "Outside price rules"
                      : "Best guess"}
                  </b>
                  {priceChecks.map((issue, i) => (
                    <p key={i}>{issue.text}</p>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
      <footer className="export-footer">
        <b>ABI RANDOMIZER</b>
        <span>
          Snapshot {first.dataVersion || dataVersion}. All prices are
          approximate (~), not exact.
        </span>
        <span>Community project / MoreFun Studios game artwork</span>
      </footer>
    </article>
  );
}
