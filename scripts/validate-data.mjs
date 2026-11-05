import fs from "node:fs/promises";
const data = JSON.parse(
  await fs.readFile(
    new URL("../src/data/catalog.json", import.meta.url),
    "utf8",
  ),
);
const ids = new Set();
let missing = 0;
for (const item of data.items) {
  if (ids.has(item.id)) throw new Error(`Duplicate item ${item.id}`);
  ids.add(item.id);
  if (!item.name || !item.wiki || !item.source)
    throw new Error(`Missing provenance ${item.id}`);
  if (!item.size.every((n) => Number.isInteger(n) && n > 0 && n <= 10))
    throw new Error(`Invalid footprint ${item.id}`);
  if (
    item.compartments &&
    !item.compartments.every((size) =>
      size.every((n) => Number.isInteger(n) && n > 0 && n <= 10),
    )
  )
    throw new Error(`Invalid layout ${item.id}`);
  if (item.price < 0 || !Number.isFinite(item.price) || item.weight < 0)
    throw new Error(`Invalid numeric field ${item.id}`);
  try {
    await fs.access(new URL("../public/" + item.icon, import.meta.url));
  } catch {
    missing++;
  }
}
console.log(
  `${ids.size} unique items validated. ${missing} icons unavailable in the source cache.`,
);
const portraits = JSON.parse(
  await fs.readFile(
    new URL("../src/data/weapon-portraits.json", import.meta.url),
    "utf8",
  ),
);
for (const [id, portrait] of Object.entries(portraits)) {
  if (!ids.has(id) || !portrait.source)
    throw new Error(`Invalid stock portrait provenance ${id}`);
  await fs.access(new URL("../public/" + portrait.path, import.meta.url));
}
console.log(
  `${Object.keys(portraits).length} complete stock-weapon portraits validated.`,
);
