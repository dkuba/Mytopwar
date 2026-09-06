# Last Column

A dependency-free browser horde-shooter prototype. A small squad grows through reinforcement and artifact choices while fighting increasingly varied enemies and bosses.

## Run locally

Serve the repository over HTTP (native JavaScript modules are used):

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Deploy on Vercel

Import `dkuba/Mytopwar`, branch `main`, with the repository root as Root Directory.
The committed `vercel.json` sets the framework to **Other**, runs `npm run build`,
and serves **dist**. No environment variables or external runtime services are required.

```bash
npm run check
npm run build
```

The build runs the content/runtime-import checks and copies only `index.html`,
`styles.css` and `src/` into `dist/`. Tests, documentation and repository metadata
are not included in the deployment output. Node.js 22 is declared in package.json.

## Controls

- `A / D` or `Left / Right`: move the squad laterally.
- Mouse/touch drag: direct the squad.
- `Space`: Rally ability.
- `Esc`: pause.

## Current prototype

- Real-time automatic fire, visible recruits and casualties.
- 12 troop archetypes, 14 enemy archetypes and 24 artifact definitions.
- Reinforcement, rescue, weapon-team and artifact choices between encounters.
- 12 campaign levels, four battlefield palettes and 10 boss archetypes.
- Endless mode, Rally, local campaign progress, credits and best-wave tracking.
- Responsive Canvas 2D rendering and procedural audio without external assets.

This is not the complete scope of the earlier game-design plan. Reward crates
and rescues currently use choice cards; shootable on-field loot containers,
physical recruitment gates, branching routes, selectable commanders and a
permanent-upgrade shop are not implemented. Credits are recorded but cannot yet
be spent. Biomes currently differ by palette rather than unique environment assets.

## Verification scope

`npm run check` validates content references/counts and imports the game runtime,
so engine syntax errors fail the check. Browser startup was additionally smoke-tested
with local assets in desktop and mobile viewports: campaign start, pause/resume,
Rally and endless start passed without JavaScript exceptions. This smoke test does
not prove complete campaign balance, long-running stability, real-device support
or a successful Vercel deployment. See `docs/PUBLISH_VERIFICATION.md`.

See `docs/IMPLEMENTATION_PLAN.md` for the gameplay iteration outline.
