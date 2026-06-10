# Architecture

## Summary

The project is structured around a shared strategy core with thin product surfaces.

```text
src/core/
  parseState.ts       # Converts Pokelike localStorage JSON into a normalized snapshot.
  strategy.ts         # Produces recommendations from a snapshot.
  traits.ts           # Battle Tower trait counting and tier logic.
  types.ts            # Shared TypeScript types.

src/extension/
  Popup.tsx           # React side-panel UI.
  chromeState.ts      # Talks to the Pokelike content script.

public/
  manifest.json       # MV3 extension manifest.
  background.js       # Opens the Chrome side panel from the extension action.
  content-script.js   # Runs on pokelike.xyz and reads localStorage.
```

## Extension Runtime

1. The browser loads `public/content-script.js` on `https://pokelike.xyz/*`.
2. The extension action opens `index.html` in Chrome's side panel.
3. The side panel asks the active tab for state with `POKELIKE_COMPANION_READ_STATE`.
4. The content script returns raw localStorage strings:
   - `poke_current_run`
   - `poke_endless_state`
5. If the content script is not connected yet, `chrome.scripting.executeScript` reads the same keys as a fallback.
6. `src/core/parseState.ts` normalizes those strings.
7. `src/core/strategy.ts` generates recommendations.
8. `src/extension/Popup.tsx` renders the side-panel tabs.

## Why This Shape

- A PWA cannot directly read `pokelike.xyz` localStorage because browser storage is origin-isolated.
- Pokelike's active run is intentionally not part of the cloud sync payload, so cloud sync is not enough for live advice.
- A browser extension content script can read page-local state while staying read-only.
- A shared core keeps the later PWA cheap: the PWA can import the same parser/scorer and use pasted/imported state.

## Data Boundaries

The MVP uses only state already visible to the user's browser. It does not transmit game state to a server.

Future exact simulation may vendor public mechanics from Pokelike's shipped scripts, including:

- type chart
- damage formula
- item effects
- move pools
- gym and Tower teams
- map generation rules

When vendoring game data, keep it isolated under a clear `game-data` module so it can be audited and updated.

## Build Target

- Framework: React + TypeScript
- Bundler: Vite
- Extension: Chrome Manifest V3
- Initial UI: side panel
- Later UI: optional overlay

## Risk Controls

- Content script only reads localStorage.
- No DOM mutation in the MVP.
- No background automation.
- Recommendations include reasons so players can evaluate the advice.
