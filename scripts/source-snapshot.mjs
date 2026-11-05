import fs from "node:fs/promises";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const directory = new URL("../data/source-cache/", import.meta.url);
await fs.mkdir(directory, { recursive: true });
const scriptURL =
  "https://raw.githubusercontent.com/hexaov91/abi-assets/main/_abi/releases/js/Shared/static-data.js";
const response = await fetch(scriptURL);
if (!response.ok) throw new Error(`Source loader: ${response.status}`);
const source = await response.text();
await fs.writeFile(new URL("tracker-public-loader.js", directory), source);
const context = vm.createContext({
  window: { location: { href: "https://abi-tracker.azurewebsites.net/" } },
  URL,
  Map,
  Set,
  Uint8Array,
  DataView,
  ArrayBuffer,
  TextEncoder,
  TextDecoder,
  crypto: webcrypto,
  Blob,
  Response,
  DecompressionStream,
  AbortController,
  fetch,
  setTimeout,
  clearTimeout,
  console,
  btoa: (input) => Buffer.from(input, "binary").toString("base64"),
});
vm.runInContext(source, context, { timeout: 10000 });
const files = [
  "weapon-detail.json",
  "bullet-detail.json",
  "armor-detail.json",
  "items/index.json",
  "items/details.json",
  "throwable/catalog.json",
];
for (const file of files) {
  const value = await context.window.StaticGameData.loadJson(
    `https://hexaov91.github.io/abi-assets/data/${file}`,
  );
  const name = file.replaceAll("/", "-");
  await fs.writeFile(new URL(name, directory), JSON.stringify(value, null, 2));
  console.log(
    name,
    Array.isArray(value) ? `${value.length} records` : Object.keys(value),
  );
}
const localeResponse = await fetch(
  "https://raw.githubusercontent.com/hexaov91/abi-assets/main/localization/game/en.json",
);
if (localeResponse.ok) {
  const bytes = await localeResponse.text();
  await fs.writeFile(new URL("localization-en.json", directory), bytes);
  console.log("Localization cached.");
}
