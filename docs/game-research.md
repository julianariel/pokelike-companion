# Game Research And Feature Plan

This note captures the current research-backed feature direction for the companion.

## Sources Checked

- Live game: https://pokelike.xyz/
- Community guide: https://pokelike-guide.fr/en/traits/
- Battle Tower trait mechanics: https://pokelike-guide.fr/en/battle-tower/trait-layer-mechanics/
- Item guide: https://pokelike-guide.fr/en/items/
- Economy and item nodes: https://pokelike-guide.fr/en/mechanics/economy/
- Team order and item placement: https://pokelike-guide.fr/en/mechanics/team-order/
- Public game scripts from `pokelike.xyz/js/*.js` for map generation, battle formulas, items, bosses, and Battle Tower traits.

## Implemented Feature Set

### 1. Adaptive Companion Music

Status: implemented.

The game currently has no music, so the extension adds optional original WebAudio loops from the side panel. It uses generated oscillator patterns, not Pokemon/GBA music or sampled assets.

Implementation:

- Detects map, battle, catch/encounter, evolution, victory, and danger moods from the current action screen and team HP.
- Requires a user click to start, matching browser autoplay rules.
- Stores volume locally with `localStorage`.
- Keeps playback fully local in the extension side panel.

Future tuning:

- Add a mute shortcut.
- Add per-mood volume balance.
- Add short transition stingers when the detected screen changes.

### 2. Battle Tower Trait Planner

Status: implemented.

Battle Tower traits are a major mode-specific decision layer. The guide and game scripts confirm type counts, shiny double-counting, and tier thresholds.

Implementation:

- Shows each detected type count, active tier, next threshold, role, current effect, and next-tier effect.
- Keeps the existing recommendation layer focused on preserving or upgrading active traits.

Future tuning:

- Add catch/swap delta cards that say exactly which traits would activate, upgrade, or break.
- Add Battle Tower stage-specific boss trait warnings, especially Steven and N.

### 3. Item Role And Holder Planner

Status: implemented.

Item choice is often the actual decision behind an item node because the game offers no currency; the choice itself is the resource.

Implementation:

- Reads carried items and held items.
- Classifies items into scaling, damage carry, sustain, survival tech, type boost, and flexible roles.
- Suggests a practical holder target from the current active team.

Future tuning:

- Use species evolution data to make Eviolite targeting exact.
- Use move category and item formulas from `battle.js` for physical/special split scoring.
- Add item-node choice comparisons that account for current holders.

### 4. Next Boss Scout

Status: implemented.

Route choices should be made against the next major fight, not only the next visible node.

Implementation:

- Shows the next boss name, type, approximate level, strong attack types, current team answers, and a level-pace warning.
- Supports normal, Gen II/Nuzlocke progression, and Battle Tower stage estimates.

Future tuning:

- Replace rough target data with exact boss teams from the live game scripts.
- Add enemy move/type coverage warnings.
- Feed this into the route scorer so paths are weighted by boss preparation, not only node value.

## Next Research Target

The next high-leverage research target is an exact deterministic battle simulator:

- Import or mirror Pokelike's damage formula.
- Model held item modifiers, STAB, type effectiveness, speed, crit odds, healing, and Battle Tower trait effects.
- Use the simulator to estimate whether a route improves or hurts boss survival.
- Keep any LLM layer opt-in and explanatory only after deterministic scores exist.
