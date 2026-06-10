# Pokelike Companion

Read-only browser extension companion for [Pokelike](https://pokelike.xyz/).

## Current State

This is the first MVP scaffold:

- React + TypeScript + Vite
- Chrome Manifest V3 extension
- Chrome Side Panel support
- content script reads Pokelike localStorage
- shared core parses run state
- persistent companion UI with live advice, team/traits, type chart, and guide tabs

## Development

```bash
npm install
npm run build
```

Load the extension in Chrome:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose "Load unpacked".
4. Select the generated `dist/` folder.
5. Open `https://pokelike.xyz/`, start or continue a run, then click the extension action.
6. Chrome should open the companion in the side panel so it can stay visible while you play.

## Distribution

Private distribution is handled through GitHub Releases:

- Pull requests and pushes to `main` run the `CI` workflow.
- Every push to `main` runs `Release Extension`.
- The release workflow builds the extension, zips `dist/`, and uploads `pokelike-companion-extension.zip` to the rolling prerelease tag `main-latest`.

For manual local packaging:

```bash
npm run package
```

That creates `pokelike-companion-extension.zip` from the generated `dist/` folder.

## Repository Practices

- `main` is protected on GitHub.
- Changes should go through pull requests.
- CI must pass before merging.
- Dependabot keeps npm and GitHub Actions dependencies current.
- See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution rules.

## Project Docs

- [Plan](docs/plan.md)
- [Architecture](docs/architecture.md)
- [Strategy Engine](docs/strategy-engine.md)
- [Repository Settings](docs/repository-settings.md)
- [Status](docs/status.md)
