# ABI Loadout Randomizer: agreed requirements

Status: requirements and final armory visual approved. Implementation is in progress; see README.md and data/manifest.json for working features and release blockers.
Research checked November 4, 2026. Game facts require versioned verification before release.

## Purpose and delivery

- Public community website designed for GitHub Pages, with full desktop and mobile support.
- Owner accepted React, TypeScript, and Vite as the development stack.
- Make awkward but playable random loadouts fun. Do not optimize away poor gear or ammunition.
- Keep the randomizer central. Put advanced controls in settings, with locks and include/exclude controls on the main page.
- No accounts, cloud saves, community voting, campaign stash, or campaign economy in the initial version.
- Plain American English throughout code, comments, copy, and commits. No em dashes or AI attribution. Add code comments only when necessary to explain non-obvious behavior for maintainers and forks.
- Include a Credits tab naming and linking all data and asset sources, crediting the game for screenshot-derived icons, and preserving applicable license notices. Keep item-level source links in addition to central credits.
- The owner approved the final armory preview and requested implementation.
- Visual direction: distinctive but consistent with ABI's game interface and theme, using similar typography or the actual game fonts where identified and available for web use. Do not claim an exact font match without evidence.
- Include animations and sound, persistent mute controls, motion-sickness settings, and accessibility controls. Per the owner's explicit preference, sound defaults on and reduced motion defaults off. Provide accessible controls to disable motion, choose an instant reveal, and mute or adjust sound; start browser audio after a user gesture. Persist chosen preferences. Do not automatically override these defaults with the device motion preference.
- Default to dark theme, with a persistent user preference for light or dark. Offer following the device theme as an option. The official game website is a visual reference, not a requirement to copy its marketing layout.
- Initial flat layout studies were rejected as lacking atmosphere, custom art, and playful motion. Revised direction emphasizes a lived-in armory workbench, with elements of the in-game equipment screen and field operations planning. The final hinged-case workbench version was approved.
- Show a small recognizable map preview image with the selected map. Mode colors: Normal white, Lockdown yellow, Forbidden red, with explicit text labels so color is not the only cue.
- Use original background art and recognizable game imagery. Reveal map, mode, weapons, and packed supplies in a deliberate user-triggered sequence, with adjustable sound, volume, reduced motion, and instant reveal.
- Allow each unrevealed equipment, map, mode, or supply slot to play its own reveal when clicked or keyboard-activated. Prepare compatible hidden results before revealing individual slots so click order cannot change validity. Keep unrevealed results out of the checklist and item details. The main button reveals the remainder of that same kit; after completion it can generate another kit.
- Strengthen reveal anticipation and payoff with localized package/latch motion, varied mechanical audio, and an item landing. Keep an option to skip the sequence. Replace the single-letter R logo with an original equipment-tag/shuffle symbol and the ABI Randomizer wordmark. Revised wording should use natural labels and avoid slogans and stiff explanatory text.
- Follow-up art direction: use realistic worn military transit cases and physical lid/latch opening, with a restrained feel similar to CS2 case presentation. Replace cartoon crate drawings and electronic tones with grounded military materials and sampled metal/soft impacts. Rework the insignia to match the armory background rather than a generic letter or flat tag.
- The owner rejected optical-flow interpolation of case stills because it morphs. Animate rigid parts around real pivots instead: keep the case body fixed while the rear-hinged lid and front latches rotate. Reserve enough camera and slot space for the fully raised lid. The latest preview uses a simple 3D model to demonstrate this motion; its asset detail remains subject to review.
- The owner approved the hinged case direction. Audio is acceptable for now but remains a later polish item.
- Keep Randomize in a fixed bottom-right dock while scrolling. Include an adjacent packing-list control with a completion count and a collapsible floating checklist panel. Preserve checklist state when opening or closing it, support Escape and a visible Close button, and reserve bottom clearance so the dock does not hide final-page controls. Adapt placement for mobile safe areas.
- Minimize scrolling on desktop by shortening the introductory header and arranging equipment and packed storage side by side. Prioritize fitting most of a solo kit in a normal desktop viewport without reducing essential text to unreadable sizes. Keep mobile layouts usable rather than forcing everything onto one screen.
- The owner approved the floating-controls direction but found some compact slots too small. Reduce the weapon's share of the layout to enlarge other gear images, names, and controls. Favor readability over eliminating every bit of scrolling, especially on mobile.
- Item shortcuts: click an unopened slot to reveal, click a revealed slot for details, Shift-click to reroll, and double-click to toggle its lock. Resolve single/double-click conflicts without rolling twice. Include visible reroll/lock buttons for keyboard and touch access. Rerolls preserve item locks and reset only affected checklist entries; normal reroll dependency validation still applies.
- Rig displays must match verified compartment geometry, including internal cell lines. The B3 reference depicts eight separate 1x2 pouches in two rows of four; reference this image rather than using total capacity alone.

## Generation and selection

- Start every visit with question-mark placeholders for randomized slots, including map and mode. Do not automatically restore the last generated kit.
- Persist settings and named configuration presets. Support saving, switching, renaming, duplicating, and deleting presets.
- Player-chosen items reset on load by default. An optional setting saves them; when enabled, show them immediately on return and include them in presets.
- Resolve map first, then an eligible mode on that map, then compatible equipment, supplies, and packing.
- Use equal map odds followed by equal odds among that map's eligible modes by default. Allow exclusions and custom weights for both.
- Cover Normal, Lockdown, Forbidden, Secure Ops, and Solo Ops, subject to actual current availability. Temporary event modes are outside initial coverage.
- Every supported equipment and supply category starts enabled. Mastery is an opt-in exception. Players can disable categories and choose a fixed item or none; fixed selections still participate in validation.
- Support individual and group include/exclude filters and optional weights, including for ammunition. Default gun odds are equal per eligible gun, not per weapon class.
- Preserve fixed and locked items. Explain impossible configurations rather than silently replacing them.

## Guns, ammunition, and attachments

- First gun: 65% primary and 35% sidearm by default. Independently roll a 10% chance of a second gun. Expose these settings and explicit slot controls, including sidearm-only.
- A second gun can be primary or sidearm when a corresponding slot is available. Never put two sidearms into one sidearm slot. The exact conditional second-gun odds remain to be specified.
- Randomize functional compatible builds. Missing sights and awkward combinations are acceptable; required firing parts cannot be omitted.
- Optional attachment slots can remain empty. Provide a setting from mostly bare to heavily modified.
- No initial build-style presets or pre-roll individual attachment configuration were requested. Individual attachment rerolls, locks, filters, and manual editing were subsequently requested and are included.
- Default attachment rerolls may change unlocked supporting mounts/adapters. Offer a setting to restrict replacements to the current assembly.
- Always supply at least one filled compatible magazine, or fill the internal magazine/chambers for guns without detachable magazines.
- Default detachable-magazine placement is storage, labeled for insertion after entry. It counts as the designated gun magazine, not an extra spare. A one-magazine roll contains exactly one magazine.
- Allow starting with the designated magazine installed instead. Internal magazines/chambers start loaded.
- A typical primary baseline is one designated gun magazine, one spare magazine, and around 120 loose rounds. Scale generous defaults by weapon type and capacity; exact class defaults remain to be set.
- Allow spare-magazine and loose-ammo settings and quantity ranges. Keep ammunition quality unbiased by default; do not compensate for low quality with better ammo odds.
- Default to one legal ammo type per gun across magazines and reserves. Optionally randomize the type per magazine, with matching reserves.
- Verify individual stack limits, item footprints, and loaded-ammunition rules rather than treating user reference dimensions as universal database facts.

## Gear, supplies, and packing

- Include armor, helmets, compatible face protection, headsets, rigs, backpacks, medical supplies, grenades, painkillers, stimulants, food, and drinks.
- Armored rigs with storage replace the separate chest rig. Validate wearable conflicts and attachment dependencies.
- Medical randomization guarantees a surgical item, healing kit, and separate bandage, even when a medkit treats bleeding. Randomize types and quantities using ABI mechanics.
- Optional supplies and grenades may roll zero while enabled. Support quantity ranges, allowed types, and weights.
- Do not randomize melee weapons or secure containers. Assume no more than the verified basic free container's space.
- Default required supplies and reserves must fit outside the secure container, which holds optional extras. Offer a setting allowing required reserve ammo in the basic container.
- Pack items into real compartments with dimensions, rotation, stack limits, and placement restrictions. Total slot count alone is insufficient.
- Offer three packing strategies: adjust supplies first (default), choose storage after supplies, or retry the randomized loadout.
- Under the default strategy, reduce optional extras before reserve ammunition; retain medical minimums and usable ammo, then try unlocked storage changes if necessary. Explain conflicts caused by fixed gear.
- Carry weight is informational only, not a generation constraint.

## Value and prices

- Separate equipment entry value from complete purchase cost. Do not use one total for both.
- Owner reports entry value counts equipped armor, helmet, face protection, headset, rig, backpack, and guns including installed attachments and magazines. Stored magazines, ammo, medicine, grenades, food, and drinks do not contribute. Verify against current game behavior.
- Default to mode entry restrictions only. Offer budget presets, custom ranges/limits, and optional cheap-to-expensive cost weighting.
- Marketplace pricing is the default. Offer vendor comparison, vendor-only, marketplace-only, and cheapest-source choices. Restricted vendor availability needs explicit handling before implementation.
- Show dated estimates and source freshness. Seek current vendor and marketplace prices without claiming an unverified live feed.
- Preserve a separate entry fee display. Its treatment in optional spending caps remains to be finalized.

## Editing and result presentation

- Show the equipped loadout and supplies inside storage grids alongside a compact hierarchical list.
- List rows show a small icon, name, quantity where applicable, and cost. Children include attachments, face shields, loaded ammo, and stored supplies. Avoid double-counting parent totals.
- Selecting an item in either view highlights its counterpart. Item details are available from both views.
- Desktop hover and keyboard focus show brief summaries; click opens details. Mobile tap opens details with the summary at the top.
- Details include stats, compatibility, price sources, freshness, and compact checkable source links for items, attachments, maps, and modes.
- Allow moving, rotating, and replacing items, with touch and keyboard alternatives to drag and drop.
- Preview dependent changes during swaps. Automatically adjust unlocked dependencies by default, preserving fixed and locked items.
- Invalid swaps warn and require an explicit override; overridden results remain visibly invalid until corrected.
- Full, category, and individual attachment rerolls; item/category locks; whole-player locks; undo restoring the previous loadout, packing, and checklist state.
- Map/mode changes warn before dependent rerolls. Apply affected unlocked changes only on acceptance; explain fixed-item conflicts.
- Checklists support item checkoffs and parent completion. Changed/replaced items reset their checkmarks; unchanged items retain theirs.
- Generation requires a button press and includes animation. Animation style remains part of the later design discussion.

## Squads

- Default to one player. Add up to three more, each initially showing placeholders until Randomize is pressed.
- All players share one map and mode. Gear rolls independently with inherited settings and optional player overrides.
- Individual Randomize buttons and a Randomize squad button. Existing kits remain unchanged when adding a player.
- Squad rolls retain an already resolved map/mode unless explicitly rerolled; resolve them before the first kit if still unknown.
- Whole-player locks preserve kits during squad rolls.
- Allow duplicates by default. Optional duplicate avoidance applies to base guns only.
- If the eligible gun pool is too small, allow repeats with a notice by default. Offer a setting to block instead.
- Budgets default to individual player settings. Support an optional total squad spending cap. Mode entry rules always apply per player.
- Exclude Solo Ops from rolls for squads with multiple players. Adding a player while Solo Ops is selected warns and requires a valid mode change before squad kits can be generated. Do not silently change the selected mode.

## Persistence, sharing, history, and challenges

- Local library: named loadouts, configuration presets, favorites, history, exclusions, and backup import/export.
- History records full and partial completed rolls, not every manual edit or inventory move. Allow reloading prior results.
- Exact share links contain the loadout, settings, quantities, attachments, packing, and locks. Use a separate temporary imported profile so opening a share never overwrites personal defaults.
- Retain outdated saved/shared results, flag current conflicts, and offer explicit repair. Seeds alone are not enough to preserve exact results across updates.
- Export one kit or the entire squad through links, copyable text checklists, and downloadable images. Include the shared map/mode where relevant.
- Separate challenge area with curated and custom rules, manually reported outcomes, streaks, goals, and reloadable runs. No money tracking, inventory carryover, or persistent campaign.
- A structured custom-rule builder was requested; its minimum rule vocabulary remains to be agreed. This must stay secondary to the randomizer.
- Mastery is an optional per-player category, disabled until enabled directly or through a saved settings preset. Include its results in saved and shared loadouts, with separate rerolls and locks.
- Mastery defaults to fully random allocation using all configured available points. Respect unlocked-skill exclusions, locked allocations, legal skill/level limits, and the point budget. Offer optional filters and weights rather than automatically optimizing skills for the gun or team size.
- Cover normal and Core Mastery separately, with current game rules verified before release. Core Mastery stays disabled even when normal mastery randomization is enabled. Players must explicitly enable it and identify eligible mission-unlocked selections; never assume those unlocks are available.

## Data updates and release safeguards

- Only verified items enter the normal generation pool. Disclose coverage gaps.
- Initial release uses approved local snapshots. The owner confirmed on November 4, 2026 that permission covers all discussed sources and icons, including public distribution with the GitHub Pages site and repository. Icons are game screenshots that have been edited. Record this as owner-provided authorization, not independent verification of every source's license.
- Defer automated upstream fetching and live updates until the owner obtains that permission after building and sharing the site. Prepare the data format and validation flow for later daily updates, but do not enable scheduled source collection under the initial cache permission.
- Once separately authorized, automate source checks and validated minor updates, retaining the last verified dataset on failure.
- Require owner review for new items, new seasons, mode-rule changes, compatibility changes, removals, and substantial database changes.
- Routine verified price, description, and icon corrections may publish automatically. Exact thresholds and source adapters remain implementation-design work.
- Preserve sources and verification dates at the field level where facts come from different places.
- Publish an approved, project-owned data snapshot with the site so upstream outages do not prevent generation. Cache versioned data and icons locally in the browser for repeat visits. Check upstream changes daily through a repository workflow where supported source access permits it; a source hash change is a candidate update, not proof of game-data correctness.
- Retain the last verified snapshot on upstream failure, invalid imports, or pending owner review. Show last verification dates. Treat browser caching and the published static snapshot as distinct layers. Exact offline application support remains an implementation decision.
- Do not equate a catalog listing, a build code, or an advertised count with complete verified compatibility.
- Preserve applicable source-specific reuse terms and notices alongside the owner's confirmed snapshot permissions. Source links and the Credits tab supplement required notices.

## Remaining design work

- Finish mastery requirements and the small set of consequential behavior questions noted above.
- Confirm a viable verified dataset and maintainable source access, including gun dependency graphs and current pricing.
- Discuss implementation approaches, then visual direction and mobile/desktop layouts with the owner.
- Prepare an approved design and implementation plan before product code or scaffolding.
