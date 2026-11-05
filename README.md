# ABI Loadout Randomizer

A static, browser-local Arena Breakout: Infinite randomizer with individual gear reveals, squad rolls, saved settings, and share cards. All data needed for a roll is bundled with the site.

## Run locally

Use Node 22.12 or newer.

```text
npm ci
npm run dev
```

Vite prints the local address. To build and check the production files:

```text
npm test
npm run data:validate
npm run build
npm run preview
```

## Included

- Individual case reveals and a full-kit reveal, rigid 3D lid animation, sampled audio, volume/mute, reduced motion, and reveal speed.
- Dark, light, and device themes with locally bundled fonts.
- Seeded weighted choices, item exclusions, fixed selections, equipment and player locks, undo, and attachment controls for the expanded weapon pool.
- Attachment dependency checks, adapter and conflict handling, automatic supporting-part changes, and a manual setting that explains required changes while preserving the current assembly.
- Loaded magazines, stored designated magazines, optional per-magazine ammo rolls, generous loose ammunition, mandatory medical coverage, and optional extras.
- Exact compartment packing, rotated footprints, packing validation, and manual move/rotate/swap controls.
- Per-player spending settings, shared squad map/mode, optional squad spending cap, and up to four players.
- Configurable price checks: a 10% margin by default, strict estimates, or informational only. Near-limit estimates carry a Best guess notice. Compatibility, packing, ammo tiers, and armor tiers stay firm.
- Optional normal mastery allocation, individual skill locks, explicit Core Mastery unlocks, and Tactical Belt pocket expansion.
- Local configuration presets, saved kits, favorites, history, backup import/export, exact compressed share links, text/data/image exports, automatic cached short redirects, and a floating packing checklist.
- Curated challenge settings, custom goals, outcome counters, win streaks, and structured win/loss setting changes.
- Local game icons, item references, source credits, data provenance, software notices, a production offline shell, and on-demand caching of viewed icons.

## Current limits

The catalog has 2,009 records and 55 storage layouts. Rolls use 82 combat firearms, with 880 candidate part records across 85 stored profiles. Four profiles use curated source descriptions; the other 78 active profiles infer parts from platform names, weapon tags, and descriptions. No assembly is in-game verified. Attachment randomization can be disabled for fixed basic builds, which also remain estimates. AX50, AR-30, and DBR are held out until their availability is confirmed. The signal gun is excluded.

Face shields use 33 published pairings across 39 helmet profiles. External headset eligibility and built-in audio use the source hearing fields. Gas-mask fit is inferred from helmet coverage and carries a Best guess notice. Headsets and face protection have their own visual kit cards, including reveal, inspect, reroll, and lock controls.

Standard mode rules use published announcements: Normal on Farm and Valley has a 300,000 equipment ceiling and tier-4 cap. Lockdown has a 150,000 floor, 900,000 ceiling, and tier-5 cap. Forbidden has a 450,000 floor on the enabled maps. Price checks allow a configurable margin, defaulting to 10 percent. Fees remain reference estimates. Seasonal replacement slots, Secure Ops, and Solo Ops are excluded where availability is unconfirmed. See `data/mode-rule-sources.json` for sources and scope.

Valley and Northridge have cached reference map images. These are preview artwork, not current extraction or routing maps. The basic secure-case geometry remains provisional. Price-source selection, cost weighting, optional weapon-class ammo quantity profiles, and support changes across arbitrary attachment graphs remain future work.

Generation checks the bundled rules, not the game client. Best guess attachment fit can still produce a build that needs changes in Gunsmith. The app preserves these warnings in shared kits and exports. See `docs/weapon-compatibility.md` and `data/manifest.json` for the remaining data gaps. Run `npm run data:weapons` to regenerate the coverage report.

## Persistence and sharing

Settings and the personal library use localStorage. Generated kits start hidden on each normal visit. Shared links carry exact item IDs, quantities, parts, packing, locks, and settings in the URL fragment. Loading a share creates a temporary profile and preserves personal defaults. Ordinary navigation keeps the fragment out of HTTP requests. When Share is opened, the app sends the complete link to is.gd to create a short redirect and caches the result locally. The full link remains available if shortening fails. Localhost links cannot be shared publicly; an optional VITE_PUBLIC_SITE_URL can point local previews at the published site.

Back up the library before clearing browser storage. Saved results from older snapshots remain inspectable and show conflicts under current validation. They are not silently repaired.

## GitHub Pages

The project uses relative asset URLs for repository subpaths. The manual `Build and publish Pages` workflow installs dependencies, checks the data, runs tests, builds, and deploys `dist`. It does not collect upstream data. In the intended repository, choose GitHub Actions as the Pages source and run that workflow when the build is ready for publication.

The regular Check workflow builds and tests pushes and pull requests without publishing. Publication is manual. See `docs/publishing.md` for repository setup, license scope, and the final public-site checks.

## License

Project-authored code is licensed under GPL-3.0-only. See `LICENSE` for the full text and `LICENSING.md` for scope. Cached community data, game artwork, fonts, and third-party software keep their own terms and notices. The GPL grant does not relicense those materials.

## Code layout

- `src/engine.ts`: deterministic generation, validation, packing, budgets, and rerolls.
- `src/storage.ts`, `src/share-codec.ts`, `src/shortener.ts`: bounded imports, persistence, compact exact sharing, and automatic is.gd redirects.
- `src/catalog.ts`, `src/mastery.ts`, `src/data`: snapshot access and curated rules.
- `src/App.tsx`, `src/Settings.tsx`, `src/Inventory.tsx`: interface and local library.
- `src/case-renderer.ts`, `src/Case.tsx`, `src/audio.ts`: presentation effects.
- `src/engine.test.ts`: generation, packing, import, and lock regressions.

Game artwork belongs to its respective owners. This community project is not affiliated with MoreFun Studios.

## Share card design study

`export-preview.html` is a development-only solo/squad design study using sample kits. Open it through the dev server. The draft uses the approved armory art and complete stock-weapon portraits; the attachment list remains the actual generated build. The images in `docs/previews` are review artifacts, not final approved artwork.

`python scripts/build-weapon-pool.py` manually rebuilds the inferred profiles from the approved cached tracker data and normalized catalog. Curated profiles stay separate in `data/curated-weapon-plans.json`. No network requests run in this generator.
