# Publication verification

## Changes made before publishing

- Fixed a missing closing brace in `Game.makeEndlessLevel` that prevented the game module from parsing.
- Added a game-runtime import to the content checks so the same syntax regression is caught.
- Added an explicit static build, Vercel configuration and repository ignore rules.
- Kept the existing gameplay scope; this publication pass is not a completion of the entire design plan.

## Checks performed

- `node --check` on every JavaScript module in src, tests and scripts: passed.
- `npm run check`: passed (12 troops, 14 enemies, 24 artifacts, 12 levels, 10 boss archetypes).
- `npm run build`: passed; output contains only browser assets.
- Offline Chromium smoke: 1280x800 desktop and 390x844 mobile viewports.
- Campaign start, pause/resume, Rally and endless start passed in both viewports with zero JavaScript exceptions.

## Boundaries

The browser environment blocked navigation to the local HTTP server. The smoke test
therefore embedded the same local assets using module data URLs, with no external
requests. It does not qualify HTTP hosting, localStorage persistence, real mobile
devices, complete levels, long sessions or Vercel itself. No deployed-site URL has
been verified in this publication pass.

## Gameplay limitations

Physical gates, shootable reward containers, environment-specific geometry,
commander selection and a spendable meta-progression system from the design plan
are not implemented. Current reward choices are modal cards; credits are counters.
The iteration document describes the prototype's layers, not independently
recorded proof that every original planned feature was completed.
