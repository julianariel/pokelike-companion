# Pokelike Companion

Route smarter. Build cleaner. Wipe less.

[![CI](https://github.com/julianariel/pokelike-companion/actions/workflows/ci.yml/badge.svg)](https://github.com/julianariel/pokelike-companion/actions/workflows/ci.yml)
[![Latest build](https://img.shields.io/github/v/release/julianariel/pokelike-companion?include_prereleases&label=extension%20build)](https://github.com/julianariel/pokelike-companion/releases/tag/main-latest)
[![License](https://img.shields.io/github/license/julianariel/pokelike-companion)](LICENSE)

**Pokelike Companion** is a read-only Chrome side-panel advisor for [Pokelike](https://pokelike.xyz/), the roguelike Pokemon browser game.

It watches your live run, scores your next choices, and explains the route like a coach sitting next to the map. No auto-play. No botting. No account tricks. Just better decisions.

## What It Does

- Picks the best next map click from your visible options.
- Plans the broader visible route, not only the immediate node.
- Tracks team health, levels, held items, move tiers, and types.
- Explains Nuzlocke danger, boss readiness, catch tempo, and healing value.
- Scores Battle Tower traits, including type-pair tiers and shiny double-counts.
- Ranks action screens such as catches, items, swaps, trades, stat buffs, and Elite prep.
- Includes a type chart and compact strategy guide.
- Keeps a local learning log of recommendation samples and detected win/loss outcomes, with JSON export for issue reports.

## Install

Download the latest extension build:

[**Download `pokelike-companion-extension.zip`**](https://github.com/julianariel/pokelike-companion/releases/download/main-latest/pokelike-companion-extension.zip)

Then load it in Chrome:

1. Extract the zip.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the extracted folder.
6. Open [pokelike.xyz](https://pokelike.xyz/), start or continue a run, then click the extension action.

The companion opens as a Chrome side panel so it can stay visible while you play.

## Support The Run

This project is free and community-driven. The cleanest support setup is external links, not payments inside the extension.

Recommended support rails:

- **Cafecito** for creator-style support in Argentina and LatAm.
- **Mercado Pago** for simple one-time payment links or recurring support.
- **Crypto** for advanced supporters: `julianariel.eth` on EVM-compatible chains.

Crypto safety notes:

- Treat `julianariel.eth` as EVM-only support unless another address is published.
- Send a small test transaction first.
- Make sure your wallet resolves the ENS name on the chain you intend to use.
- Never send seed phrases, private keys, or exchange login details.

See [Support Setup](docs/support.md) for the recommended donation stack and rollout checklist.

## Learning From Runs

The first learning layer is local-only. The extension records deduplicated recommendation states and detected win/loss screens in Chrome extension storage. That gives the project a base for future tuning without sending gameplay data anywhere.

The Advisor tab can export that local history as JSON or clear it at any time.

Planned strategy upgrades:

- outcome-weighted node scores
- per-mode win-rate summaries
- boss and battle simulation
- Battle Tower trait delta tracking
- optional LLM explanation layer after deterministic scoring exists

The LLM layer should be opt-in and explain scenarios; it should not replace deterministic scoring or upload run data by default.

## Development

```bash
npm install
npm run build
```

Run locally:

```bash
npm run dev
```

Package the extension:

```bash
npm run package
```

## Distribution

Every push to `main` runs:

- `CI`: builds and uploads a workflow artifact.
- `Release Extension`: builds, zips `dist/`, moves the `main-latest` tag, and replaces the rolling release asset.

Protected `main` requires pull requests, review, the `build` status check, linear history, and resolved conversations.

## Privacy

- The extension reads Pokelike state from the active `pokelike.xyz` tab.
- The companion does not automate gameplay.
- Learning history is stored locally in Chrome extension storage.
- Learning history can be exported manually as JSON for bug reports or strategy tuning.
- No donation, wallet, or payment information is collected by the extension.

## Contributing

Good strategy advice needs real game observations. Useful contributions include:

- screenshots or notes from bad recommendations
- mode-specific route heuristics
- Battle Tower trait edge cases
- boss/team data
- UI copy that makes advice easier to trust

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Project Docs

- [Plan](docs/plan.md)
- [Architecture](docs/architecture.md)
- [Strategy Engine](docs/strategy-engine.md)
- [Support Setup](docs/support.md)
- [Repository Settings](docs/repository-settings.md)
- [Status](docs/status.md)
