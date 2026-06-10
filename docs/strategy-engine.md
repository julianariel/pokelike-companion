# Strategy Engine Notes

## Current MVP Scoring

The first strategy engine is intentionally heuristic. It should be easy to inspect, tune, and replace with deeper simulation later.

Inputs:

- run mode: Normal, Nuzlocke, or Battle Tower
- team members
- held items
- HP totals
- accessible map nodes
- Battle Tower state when present

Outputs:

- ranked recommendation cards
- supporting reasons
- warning cards
- Battle Tower trait summary

## Battle Tower Traits

Trait tiers are based on type counts:

- Tier 1: 2 matching type counts
- Tier 2: 4 matching type counts
- Tier 3: 6 matching type counts
- shiny Pokemon count as 2 for each of their types

The MVP computes active traits from the current team and uses trait tier deltas as one of the strongest team-building signals.

## Node Heuristics

Initial node scoring:

- `catch`: useful for forming an early core, but discounted after roughly 3 Pokemon in Normal mode because it costs battle/trainer XP tempo
- `pokecenter`: high value when HP is low
- `item`: steady value, higher when the run has few items
- `move_tutor`: high value when any living team member has unmastered moves; often better than another early catch
- `trainer`: higher when healthy because trainers grant stronger level tempo
- `battle`: baseline XP/progress value; wild battles grant level tempo without adding roster clutter
- `boss`: warning-oriented, based on team health and type coverage
- `trade`: medium value outside Nuzlocke
- `legendary`: high value, with risk warning

Current game facts used by the scorer:

- Wild battles use `baseGainOverride = 1`, so eligible team members gain +1 level.
- Trainers use base gain 2, so eligible team members gain +2 levels.
- Silver grants +4 levels and full-heals after the fight, but is still risky before resolution.
- Catch nodes preserve options but do not grant immediate XP.
- Battle Tower catch value is different: type trait creation/upgrades can outweigh level tempo.

## Action Screens

The extension reads the active Pokelike screen from the content script and provides advice outside the map:

- `catch-screen`: ranks visible Pokemon by level, new type coverage, and Battle Tower trait potential.
- `item-screen`: ranks visible item rewards by immediate run value.
- item/usable-item modals: gives target-selection guidance.
- `swap-screen`: compares the incoming Pokemon against the weakest slot and warns against breaking a leveled core.
- `trade-screen`: treats trades as weakest-slot replacement, not core replacement.
- `stat-buff-screen`: recommends concentrating permanent buffs on likely carries.
- `elite-prep-screen`: reminds the player to reorder and spend healing/items before continuing.
- `battle-screen`: waits for battle resolution and live refresh.

## Readiness Estimate

The current estimate is a heuristic, not a full battle simulator. It combines:

- average team level vs next boss target level
- average team HP
- healthy team size
- coarse type coverage into the next boss type
- Nuzlocke risk penalty
- Battle Tower active trait bonus

This gives a rough boss readiness percentage so route scoring can prefer XP/setup when the run is underprepared.

## Team Heuristics

Initial team scoring looks at:

- team size
- fainted members
- average HP ratio
- type diversity
- active Battle Tower trait tiers
- unmastered moves

## Future Simulation

The next strategy upgrade should mirror Pokelike's battle engine enough to estimate:

- win probability
- expected HP lost
- best team order
- item/equip value
- boss-specific risk
- catch/swap expected value

Simulation should initially run multiple deterministic seeds against the current state rather than trying to predict a single exact RNG path.

## Learning From Outcomes

The extension now keeps a local-only learning log in Chrome extension storage.

Captured events:

- deduplicated recommendation states
- current mode and map
- next-click recommendation
- visible route labels
- team size and average HP
- detected win/loss screens when Pokelike exposes them

This is intentionally small and private. It gives the companion enough historical context to calculate local win-rate summaries before any remote analytics or account system exists.

Players can export the local learning log as JSON from the Advisor tab when they want to share evidence in an issue. They can also clear the local log without affecting Pokelike data.

Near-term tuning path:

1. Count outcomes by mode and route node type.
2. Compare recommended routes against later win/loss outcomes.
3. Lower scores for repeated high-risk decisions that correlate with losses.
4. Raise scores for mode-specific decisions that repeatedly precede clears.
5. Export anonymized debug bundles only when a player explicitly shares them in an issue.

## LLM Layer

An LLM should be an optional explainer/planner layer after deterministic scoring and simulation are stronger.

Good use cases:

- explain why two close routes differ
- summarize best-case, expected-case, and worst-case scenarios after a map is generated
- turn local stats into readable advice
- help contributors inspect bad recommendation reports

Avoid:

- sending run state to a hosted model by default
- letting the LLM override deterministic safety checks
- requiring an API key for the core extension
- making gameplay decisions opaque or unreproducible

The recommended architecture is deterministic scorer first, local outcome data second, battle simulator third, opt-in LLM explanation fourth.
