# Weapon compatibility work

## Requirements

Generate working, awkward guns without favoring strong builds. Respect part locks and exclusions. Automatically change supporting parts by default, or preserve the assembly and explain the required changes when the player selects manual handling. Saved kits and share links must retain the exact parts.

## Source findings, November 5, 2026

- ABIBuilder's [M4A1 build detail](https://abibuilder.com/builds/21txn0j) exposes a screenshot, game build code, author notes, and aggregate statistics. Its inspected server-rendered build object does not contain a part list or mount graph. This does not prove that its operator lacks other private data.
- [ABI Guide's tools page](https://abi-guide.dev/en/tools) says it is no longer maintained and has merged into ABIBuilder. The inspected public tools code reads weapon codes and optional uploaded images. It does not implement a Gunsmith simulator.
- The [Weapon Mods wiki](https://arena-breakout-infinite.fandom.com/wiki/Weapon_Mods) lists attachment names. Its category query returned only the index and two magazine pages; representative linked attachment pages were missing. The index does not describe the full mount tree.
- The cached tracker weapon data contains 95 weapon records and 103 selected attachment stat records. Weapon-wide supported tags describe broad reachability across builds. They do not identify the host part, individual socket, required component, or mutual exclusion for every part.
- A bounded read-only check found no readable item relationship tables in the installed game's Config directory. Two sampled PAK footers did not match the standard Unreal PAK footer. No game executable was run, no process was inspected, and no game files were changed. This check does not establish the archive format or whether another offline reader could extract the tables.

## Implementation

`src/data/weapon-plans.json` owns the currently supported assembly profiles and their source links. `src/weapon-assembly.ts` handles required parts, alternatives, exclusions, locked selections, weighted seeded choices, and supporting-part changes. `src/engine.ts` uses these rules for generation, attachment swaps, and validation of imported kits. Missing dependencies are errors even when price checks are informational.

The AKM profile includes the source-described PT stock adapter and dust-cover sight rail chains. The owner subsequently approved a Best guess fallback to make the full gun pool usable while complete relationship data is unavailable. The stored pool has 85 combat firearm profiles, with 82 enabled for generation: four curated profiles and 78 inferred profiles. There are 880 stored candidate part records. The owner reported that some or all of AX50, AR-30, and DBR are unavailable, so all three remain catalog-only until availability is confirmed. All unverified assemblies are marked in the kit, details, text export, and image export. No profile is marked in-game checked.

The current schema uses one occurrence of each attachment ID per profile. It must be extended to identify socket instances before importing repeated physical parts, such as two identical lights. It is not a complete reconstruction of the game's nested Gunsmith.

Run `npm run data:weapons` to validate the profile references and regenerate `data/weapon-coverage.json`. Run `npm test` for dependency and generation checks. The coverage report separates catalog records, generation profiles, and in-game checks.

## Remaining input

The full source slot graph is still missing. See `docs/weapon-data-request.md` for an exact export request. No request has been sent, and no automatic source polling has been enabled. Do not remove the release coverage disclosures until this gap is resolved.

## Best guess fallback

`python scripts/build-weapon-pool.py` joins explicit magazine families with inferred attachment groups, using the cached weapon tags, platform names, and descriptions. It retains the four curated profiles separately. Known cross-platform mistakes, such as the M16 barrel on the M4A1 and AR-30 stocks matched by the letters AR, are excluded. This is a heuristic fallback, not a recovered Gunsmith graph.

The default Randomize attachments setting is on. Turning it off applies fixed basic part and magazine preferences on the next roll, with required support parts added deterministically. Locks and exclusions still apply. Basic builds also retain the compatibility warning. Internal chambers are loaded directly for the DBR, SPR310, T05, and RM44; internal magazine chambers stay in their guns. Ammo caliber, tier, capacity, and packing rules remain enforced. AX50, AR-30, and DBR cannot appear in new rolls. Older saved or shared kits retain them and show an availability error. The stored AX50 M2 ammo record is tier 6; its price is unavailable and excluded from totals with a notice.
