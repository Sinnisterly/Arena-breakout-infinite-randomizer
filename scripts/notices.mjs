import fs from "node:fs/promises";
import path from "node:path";
const pkg = JSON.parse(await fs.readFile("package.json", "utf8"));
await fs.mkdir("public/notices", { recursive: true });
await fs.copyFile("LICENSE", "public/notices/GPL-3.0.txt");
await fs.copyFile("LICENSING.md", "public/notices/LICENSING.md");
let notices =
  "Third-party software notices\n\nGame artwork and cached community data are separately credited in the app.\n\n";
for (const name of Object.keys(pkg.dependencies)) {
  const directory = path.join("node_modules", name),
    manifest = JSON.parse(
      await fs.readFile(path.join(directory, "package.json"), "utf8"),
    );
  notices += `${name} ${manifest.version}\nLicense: ${manifest.license}\n`;
  const files = await fs.readdir(directory);
  const license = files.find((n) => /^licen[sc]e(?:\.|$)/i.test(n));
  if (license)
    notices += await fs.readFile(path.join(directory, license), "utf8");
  notices += "\n\n";
}
await fs.writeFile("public/notices/software.txt", notices);
await fs.mkdir("public/data", { recursive: true });
await fs.copyFile("data/manifest.json", "public/data/manifest.json");
await fs.copyFile("src/data/catalog.json", "public/data/catalog.json");
await fs.copyFile(
  "data/weapon-coverage.json",
  "public/data/weapon-coverage.json",
);
await fs.copyFile(
  "src/data/weapon-plans.json",
  "public/data/weapon-plans.json",
);

await fs.copyFile("src/data/wearables.json", "public/data/wearables.json");
await fs.copyFile(
  "data/mode-rule-sources.json",
  "public/data/mode-rule-sources.json",
);
await fs.copyFile(
  "data/map-art-sources.json",
  "public/data/map-art-sources.json",
);
