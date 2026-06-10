# Contributing

## Development Setup

```bash
npm ci
npm run build
```

Load the generated `dist/` folder as an unpacked extension from `chrome://extensions`.

## Workflow

- Create a branch for each change.
- Open a pull request into `main`.
- Keep changes focused and update docs when behavior changes.
- Run `npm run build` before requesting review.

## Strategy Changes

Strategy changes should be grounded in Pokelike mechanics. When changing scoring:

- Document the game fact or observed behavior behind the change.
- Prefer mode-specific rules over broad global boosts.
- Keep recommendations explainable in one or two reasons.
- Avoid automating gameplay or clicking for the player.

## Releases

Every push to `main` builds the extension and updates the rolling GitHub Release tagged `main-latest`.
