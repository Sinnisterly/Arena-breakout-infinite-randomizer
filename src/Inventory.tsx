import { asset, byId, displayIcon } from "./catalog";
import { compartments } from "./engine";
import type { Kit, Supply } from "./types";
import { itemLabel, itemPrice } from "./presentation";
export function ItemIcon({ id, ...props }: { id: string; className?: string }) {
  const item = byId[id];
  return item ? (
    <img
      src={asset(displayIcon(item))}
      alt=""
      loading="lazy"
      title={
        item.kind === "weapon"
          ? "Standard weapon appearance. Rolled attachments are listed separately."
          : undefined
      }
      {...props}
      onError={(e) => {
        e.currentTarget.style.visibility = "hidden";
      }}
    />
  ) : (
    <span className="missing-icon">?</span>
  );
}
export default function Inventory({
  kit,
  revealed,
  onItem,
  onOpen,
}: {
  kit: Kit;
  revealed: string[];
  onItem: (item: Supply) => void;
  onOpen: (key: string) => void;
}) {
  const groups = [
    { key: "rig", name: "Chest rig" },
    { key: "armor", name: "Armored rig" },
    { key: "bag", name: "Backpack" },
    { key: "pocket", name: "Pockets" },
    { key: "secure", name: "Basic secure case" },
  ];
  const all = compartments(kit);
  return (
    <div className="inventory-groups">
      {groups.map((group) => {
        const cells = all.filter((c) => c.id.startsWith(group.key + ":"));
        if (!cells.length) return null;
        const gear = kit.gear[group.key as keyof Kit["gear"]];
        const visible = !gear || revealed.includes(group.key);
        return (
          <section className="storage-part" key={group.key}>
            <h3>{group.name}</h3>
            <p className="storage-sub">
              {visible
                ? gear
                  ? byId[gear.id]?.name
                  : ""
                : "Open the gear slot to see its compartments."}
            </p>
            {visible ? (
              <div
                data-item={gear?.id}
                className={`compartment-group ${group.key}`}
              >
                {cells.map((c) => (
                  <div
                    className="compartment"
                    key={c.id}
                    style={{
                      gridTemplateColumns: `repeat(${c.size[0]}, var(--cell))`,
                      gridTemplateRows: `repeat(${c.size[1]}, var(--cell))`,
                    }}
                    aria-label={`${group.name} ${c.size[0]} by ${c.size[1]}`}
                  >
                    {Array.from({ length: c.size[0] * c.size[1] }, (_, i) => (
                      <span
                        className="inventory-cell"
                        key={i}
                        style={{
                          gridColumn: (i % c.size[0]) + 1,
                          gridRow: Math.floor(i / c.size[0]) + 1,
                        }}
                      />
                    ))}
                    {kit.supplies
                      .filter((s) => s.container === c.id)
                      .map((s) => {
                        const w = s.rotated ? s.size[1] : s.size[0],
                          h = s.rotated ? s.size[0] : s.size[1],
                          shown = revealed.includes(s.uid);
                        return (
                          <button
                            className={`inventory-item ${shown ? "" : "unopened"}`}
                            key={s.uid}
                            style={{
                              gridColumn: `${s.x! + 1} / span ${w}`,
                              gridRow: `${s.y! + 1} / span ${h}`,
                            }}
                            onClick={() => (shown ? onItem(s) : onOpen(s.uid))}
                            title={
                              shown
                                ? `${itemLabel(s.id)} ${s.quantity > 1 ? "x" + s.quantity : ""}${s.ammoId ? ` / ${s.rounds} ${itemLabel(s.ammoId)}` : ""} / ${itemPrice(s)} Koen`
                                : "Open this item"
                            }
                            aria-label={
                              shown
                                ? `Details for ${itemLabel(s.id)}${s.ammoId ? ` / ${itemLabel(s.ammoId)}` : ""}`
                                : "Open packed item"
                            }
                          >
                            {shown ? (
                              <>
                                <ItemIcon id={s.id} />
                                {(byId[s.id]?.kind === "ammo" || s.ammoId) && (
                                  <span
                                    className="inventory-ammo-tier"
                                    title="Ammo tier"
                                  >
                                    T{byId[s.ammoId ?? s.id]?.tier ?? "?"}
                                  </span>
                                )}
                                <b>
                                  {s.rounds ??
                                    (s.quantity > 1 ? s.quantity : "")}
                                </b>
                                {s.role === "gun-mag" && (
                                  <span className="designated-mag">G</span>
                                )}
                              </>
                            ) : (
                              <span>?</span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                ))}
              </div>
            ) : (
              <button
                className="storage-question"
                onClick={() => onOpen(group.key)}
              >
                ?
              </button>
            )}
            {group.key === "secure" && (
              <p className="packing-note">
                One 1 x 2 compartment. Required items stay outside by default.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
