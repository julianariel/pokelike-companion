# Pokelike Companion Plan

## Goal

Build a read-only strategy companion for [Pokelike](https://pokelike.xyz/) that helps players make better decisions during a run without automating gameplay.

The first product surface is a browser extension because live run state is stored in `pokelike.xyz` localStorage and cannot be read by a normal PWA. A PWA/website can come later as a planner, landing page, guide, and offline strategy reference that reuses the same strategy engine.

## Product Principles

- Recommend, do not play for the user.
- Explain decisions with concrete game mechanics: type coverage, HP risk, trait tiers, team size, items, and upcoming bosses.
- Keep all companion logic read-only against the game page.
- Prefer deterministic game data and localStorage state over screenshot/OCR guessing.
- Keep the strategy engine independent from extension UI so it can also power a future PWA.

## Phases

### Phase 1: Extension MVP

- React + Vite + TypeScript extension shell.
- Chrome Manifest V3 popup.
- Content script reads `poke_current_run` and `poke_endless_state` from Pokelike localStorage.
- Shared strategy core parses current run state.
- Popup shows:
  - current mode
  - team summary
  - active Battle Tower traits
  - accessible map node recommendation
  - basic risk warnings

### Phase 2: Better Strategy Engine

- Mirror more of Pokelike's public mechanics:
  - type chart
  - move selection
  - item effects
  - map node weights
  - boss/gym/Tower teams
- Add battle matchup scoring.
- Add catch/swap comparison.
- Add held-item recommendations.
- Add Nuzlocke-specific safety scoring.

### Phase 3: In-Game Overlay

- Optional map node highlight overlay.
- Side panel view for richer recommendations.
- Hover/click inspection for "why this node" and "why this swap".
- Keep the game controls untouched.

### Phase 4: PWA / Website

- Landing page.
- Offline guide.
- Team builder.
- Battle Tower trait planner.
- Manual/imported run-state analysis.

## Non-Goals For The MVP

- No auto-clicking or auto-playing.
- No account integration.
- No cloud-save mutation.
- No game patching.
- No full battle simulator until basic scoring proves useful.

## Open Questions

- Chrome-only first, or package for Firefox after MVP?
- Popup first or side panel first after the basic extension works?
- Should the extension include a manual paste/import fallback for browsers where content scripts are blocked?
- How much exact game data should be vendored versus fetched from Pokelike at build time?
