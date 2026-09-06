# Last Column

A dependency-free browser horde shooter inspired by the realtime crowd-combat loop discussed for Top War, expanded into a standalone roguelite campaign.

## Play locally

The project uses native ES modules, so serve the repository over HTTP:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Controls

- `A / D` or `← / →`: move the squad laterally.
- Mouse/touch drag: direct the squad.
- `Space`: Rally ability.
- `Esc`: pause.

## Implemented gameplay

- Auto-fire realtime crowd combat.
- Visible army growth and troop losses.
- 12 troop archetypes with distinct combat roles.
- 14 enemy archetypes including support, ranged, burrowing, splitting and summoning enemies.
- Reinforcement, rescue and weapon-team choices.
- 24 artifacts with stacking, rarity and build-changing effects.
- 12 handcrafted campaign levels across four battlefield biomes.
- 10 boss archetypes with different phase logic, including linked twins, summons, weak-point armor cycling, bombing zones, burrowing and multi-phase fights.
- Endless mode with escalating wave budgets.
- Rally active ability.
- Persistent local campaign progress, credits and endless best wave.
- Responsive mouse, keyboard and touch input.
- Canvas-based renderer with no external assets or runtime dependencies.

See [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) for the iteration history and architecture.
