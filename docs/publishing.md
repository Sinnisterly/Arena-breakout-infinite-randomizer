# Publishing on GitHub Pages

## Repository setup

The repository is [Sinnisterly/Arena-breakout-infinite-randomizer](https://github.com/Sinnisterly/Arena-breakout-infinite-randomizer). The project already includes a README, GPL v3 license, ignore rules, and workflows, so there is no need to generate those files on GitHub.

The repository does not need a backend, database, API key, or GitHub secret for the included Pages workflow. Use Node 22.12 or newer for local work.

Before the initial commit, review the files being added. `node_modules`, `dist`, local source caches, and build logs are ignored. The normalized data and public assets are included so GitHub can build without fetching upstream sources.

## Checks and deployment

1. Run `npm ci`, `npm run data:validate`, `npm test`, and `npm run build`.
2. Push the reviewed project to the repository. The Check workflow runs on pushes and pull requests.
3. In repository Settings, open Pages and select GitHub Actions as the build source.
4. In Actions, run **Build and publish Pages**. Deployment is manual and publishes `dist` after validation, tests, and the build succeed.
5. Open the deployment URL shown by the workflow and complete the public-site checks below.

Vite uses relative asset paths for repository subpaths. The build uses only the bundled snapshot. It does not fetch new game data or prices.

## Public-site checks

- Open the repository Pages URL directly and reload it. Check icons, map previews, fonts, case animation, and sound after interaction.
- Roll a solo kit and a squad. Confirm the shared map and mode, player locks, wearable cards, and readable storage cells.
- Check a phone layout for horizontal overflow and usable controls.
- Save and reload a kit, export a library backup, and check settings persistence.
- Generate solo and squad images. Confirm names, attachment lists, ammo tiers, approximate prices, and Best guess notices remain readable.
- Open a full share link in a fresh tab. Check exact gear and settings. Return to the personal setup and confirm saved defaults are preserved.
- Create and open a shortened link from the public site. Shortening depends on is.gd; retain the full link and image export as fallbacks. A localhost link is not publicly usable.
- Revisit after loading once to check the offline shell. Short-link creation still requires a network connection.

For local previews that should share the published destination, set `VITE_PUBLIC_SITE_URL` to the full public site URL before building. Normal public builds can use their current URL without this override.

## Known limits at launch

Attachment assemblies and basic builds include inferred choices. Gas-mask fit is also inferred. The app discloses these limits; do not describe compatibility as guaranteed. AX50, AR-30, DBR, unconfirmed rotations, Secure Ops, and Solo Ops remain excluded from new rolls. Fees and secure-case geometry retain provisional data. Prices are approximate snapshot values.

Project-authored code uses GPL-3.0-only. Keep the separate data, artwork, font, and dependency notices described in `LICENSING.md`.
