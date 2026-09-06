# Implementation plan

> Historical prototype roadmap, not a checked-off acceptance ledger. For verified
> current scope and unimplemented design features, see README.md and
> docs/PUBLISH_VERIFICATION.md. The publication pass does not claim completion
> of every feature described below.

The project is implemented as focused, independently testable iterations. Each iteration introduces one gameplay layer and avoids unrelated expansion.

## I0 — Foundation

**Focus:** deterministic browser runtime and rendering shell.

- Static HTML/CSS application.
- Canvas 2D renderer.
- Fixed-step simulation loop.
- Keyboard, pointer and touch input.
- Menu/HUD/pause/result surfaces.

**Exit:** a stable game loop can run without build tooling or third-party dependencies.

## I1 — Combat core

**Focus:** make shooting a moving horde satisfying before adding progression.

- Player formation.
- Automatic target acquisition.
- Hitscan tracers and projectile explosions.
- Enemy movement and contact damage.
- Death resolution and victory/defeat.

**Exit:** a small squad can fight a large realtime horde.

## I2 — Army growth

**Focus:** visible growth during a mission.

- Recruit and rescue rewards.
- Formation expansion and automatic reflow.
- Persistent casualties inside the run.
- Camera-independent large formations.

**Exit:** the player can start with four troops and finish with a visibly larger army.

## I3 — Combat roles

**Focus:** make composition matter rather than relying on raw unit count.

- 12 troop archetypes.
- AoE, chain, armor penetration, healing and frontline behavior.
- 14 enemy archetypes.
- Armor, ranged attackers, support, bombers, splitters, burrowers and summoners.

**Exit:** different army/enemy compositions produce materially different fights.

## I4 — Rewards and buildcraft

**Focus:** meaningful decisions every 10–20 seconds.

- Reinforcement choices.
- Weapon-team crates.
- Rescue pods.
- 24 artifacts across offense, defense, army, fire, storm and ordnance themes.
- Additive and multiplicative stacking rules.

**Exit:** two runs through the same mission can form different builds.

## I5 — Boss framework

**Focus:** bosses must test different player skills.

- Shared boss data contract.
- Health phases.
- Summoning, charge, armor-cycle, bombardment, burrowing and enrage mechanics.
- Ten boss archetypes.

**Exit:** bosses are mechanically distinct, not just high-HP enemies.

## I6 — Level director

**Focus:** controlled difficulty growth.

- Wave budget system.
- Named wave archetypes rather than fully random generation.
- 12 handcrafted campaign levels.
- Four biome palettes.
- Elite encounters and reward cadence.

**Exit:** difficulty grows through density, composition and mechanics, not only HP scaling.

## I7 — Meta and replayability

**Focus:** complete playable product loop.

- Local campaign progression.
- Credits.
- Endless mode.
- Persistent best-wave result.
- Result statistics and replay flow.

**Exit:** a player can launch, progress, lose, retry, finish campaign levels and continue in endless mode.

## I8 — Hardening and polish

**Focus:** browser readiness.

- Responsive UI.
- Pointer/touch controls.
- Lightweight procedural audio.
- No external runtime dependencies.
- Syntax/static verification.

**Exit:** repository can be served by any static HTTP server.

## Architecture

```text
index.html / styles.css
       |
       v
src/main.js -------- UI + input + persistence
       |
       v
src/core/game.js --- fixed-step simulation + renderer
       |
       +--> data/units.js
       +--> data/enemies.js
       +--> data/artifacts.js
       +--> data/levels.js
       +--> data/bosses.js
       +--> systems/audio.js
       +--> core/random.js
```

Content is data-driven where practical. The simulation owns authoritative combat state; the DOM is limited to menus and HUD. The canvas never creates DOM nodes per combat entity.

## Future production hardening

The current release is a complete playable prototype. For a commercial-scale version, the next isolated batches should cover automated browser tests, profiling at 1,000+ entities, asset pipeline, accessibility/audio settings, cloud saves, analytics, and content-authoring tools. These are deliberately excluded from the gameplay implementation iterations above.
