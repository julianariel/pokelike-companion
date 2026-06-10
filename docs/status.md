# Status

## 2026-06-09

### Milestone: Planning Started

Status: complete

- Created the repo-local planning structure.
- Captured extension-first product direction.
- Captured shared-core architecture.
- Captured first-pass strategy-engine heuristics.

### Next

- Scaffold the React + Vite + TypeScript extension.
- Implement read-only Pokelike localStorage collection through a content script.
- Implement the basic parser, trait counter, and recommendation UI.
- Verify the extension build.

### Milestone: Extension MVP Scaffold

Status: complete

- Added React + TypeScript + Vite project setup.
- Added Chrome Manifest V3 extension manifest.
- Added read-only content script for `poke_current_run` and `poke_endless_state`.
- Added shared core modules for state parsing, trait tiers, and first-pass recommendations.
- Added popup UI for mode, map, team, items, recommendations, and team health.
- Added README and repository hygiene.

### Verification

- `npm install` completed with 0 vulnerabilities.
- `npm run build` passed.
- Build output includes `dist/manifest.json`, `dist/content-script.js`, `dist/index.html`, popup JS, and popup CSS.

### Next

- Load the unpacked extension in Chrome and test against a live Pokelike run.
- Add exact type chart and boss/team data to improve matchup scoring.
- Add catch/swap comparison for Battle Tower trait deltas.
- Add optional side panel or overlay after popup flow is validated.

### Milestone: Live State Read Fallback

Status: complete

- Fixed popup failures when Chrome reports `Could not establish connection. Receiving end does not exist.`
- Added `chrome.scripting.executeScript` fallback to read Pokelike localStorage when the content script has not been injected into an already-open tab.
- Added the required `scripting` permission to the extension manifest.

### Verification

- `npm run build` passed after the fallback change.

### Next

- Reload the unpacked extension in Chrome so the new `scripting` permission is active.
- Test the popup on an already-open Pokelike tab and on a freshly reloaded Pokelike tab.

### Milestone: Friendlier Recommendations And Map Plan

Status: complete

- Replaced raw node guidance like `Take node n2_0 on layer 2` with player-facing labels such as left/right reward choices.
- Added full visible-map parsing for nodes and edges.
- Added route-level planning that scores the best downstream visible path, not only the next clickable node.
- Split the popup into clearer sections:
  - Next Move
  - Map Plan
  - Battle Tower Traits
  - Run Notes
  - Team Status
- Added tooltip help icons explaining what each section means.
- Added Battle Tower trait chips showing active/inactive tiers and progress to the next threshold.

### Verification

- `npm run build` passed after the UX and map-planning changes.

### Next

- Test the sectioned popup against a real live run.
- Tune route scores after observing whether early catches/items/trainers feel properly weighted.
- Add catch/swap comparison so Battle Tower trait deltas are shown before committing to a Pokemon.

### Milestone: Side Panel Companion And Reference Tabs

Status: complete

- Converted the extension from popup-first to Chrome Side Panel-first.
- Added `public/background.js` so clicking the extension action opens the persistent side panel.
- Added the required `sidePanel` manifest permission and `side_panel.default_path`.
- Reworked the React UI into tabs:
  - Advisor
  - Team
  - Types
  - Guide
- Added a type chart reference with attack-type selection and matchup summaries.
- Added a guide tab with route, Nuzlocke, and Battle Tower notes.
- Restyled the panel toward a 2D pixel RPG look with framed panels, pixel menu tabs, type-colored pills, and compact game-like cards.

### Verification

- `npm run build` passed.
- Generated `dist/manifest.json` includes `side_panel`, `background.service_worker`, and `sidePanel` permission.
- Generated `dist/` includes `background.js`, `content-script.js`, `index.html`, popup JS, and CSS assets.

### Next

- Reload the unpacked extension in Chrome after the manifest change.
- Click the extension action to open the side panel.
- Test live state refresh while playing a run.
- Add a richer team planner: best held item, weakest slot, and Battle Tower catch/swap trait delta.

## 2026-06-10

### Milestone: Meta-Aware Live Advisor

Status: complete

- Re-researched current Pokelike scripts for route tempo and action-screen behavior.
- Confirmed key tempo facts:
  - Wild battles grant +1 level.
  - Trainers grant +2 levels.
  - Silver grants +4 levels and heals afterward, but has fight risk.
  - Catch nodes add options but do not provide immediate XP.
- Tuned map scoring so Normal early game stops over-prioritizing catches after a small core is built.
- Kept Battle Tower catch value higher when it can create or upgrade type traits.
- Added a rough boss-readiness estimate using level, HP, team size, next boss type, Nuzlocke risk, and Battle Tower traits.
- Added active-screen extraction from the content script and injected fallback.
- Added automatic live refresh every ~1.4 seconds with a `LIVE ON/OFF` toggle.
- Added advice for non-map action screens:
  - catch choice
  - item pick
  - item equip / usable-item target
  - swap
  - trade
  - stat buff
  - battle screen
  - Elite prep
- Removed the old global top-6 recommendation cap so each tab section can show its own advice.

### Verification

- `npm run build` passed.
- Generated `dist/content-script.js` includes action-screen extraction.
- Generated side-panel JS includes `LIVE ON`, action recommendations, catch/item advice, and boss-readiness text.

### Next

- Test against live runs on map, catch, item, swap, and Battle Tower stat-buff screens.
- Replace the rough readiness percentage with a proper battle simulator using Pokelike's damage formula and boss teams.
- Add exact catch/swap trait delta cards for Battle Tower.
- Add held-item target scoring using Pokemon move type and stats.

### Milestone: GitHub Repository And Release Automation

Status: in progress

- Added CI workflow for pull requests and pushes to `main`.
- Added release workflow that builds and uploads `pokelike-companion-extension.zip` to a rolling `main-latest` prerelease.
- Added Dependabot config for npm and GitHub Actions.
- Added CODEOWNERS, issue templates, PR template, contributing guide, security policy, and license.
- Created private GitHub repo: `julianariel/pokelike-companion`.
- Pushed initial `main` commit.
- Configured repo settings: issues enabled, wiki/projects disabled, delete branch on merge enabled.

Branch protection note:

- Attempted classic branch protection and repository rulesets for `main`.
- GitHub rejected both because protected branches/rulesets for this private personal repo require GitHub Pro or a public repo.
- See `docs/repository-settings.md` for the target settings and commands to apply once available.

Verification:

- Local `npm run build` passed.
- Local `npm run package` produced `pokelike-companion-extension.zip`.
- Remote `CI` workflow passed on initial push.
- Remote `Release Extension` workflow passed on `main`.
- Rolling release `main-latest` exists with `pokelike-companion-extension.zip`.
- GitHub Actions versions were updated to the current Dependabot-recommended majors.

### Milestone: Advisor UX Polish

Status: complete

- Replaced remaining debug-style map language with lane and reward labels.
- Added recommendation metadata so route cards can show numbered visible-map steps.
- Renamed advisor sections for clarity:
  - Current Decision
  - Best Next Click
  - Visible Map Plan
  - Run Notes
- Made section explanations visible under each section title instead of relying only on hover tooltips.
- Added a compact visible-map overview that distinguishes next, planned, future, and visited nodes.

### Verification

- `npm run build` passed.
- Local Vite smoke test loaded the companion UI with no browser console errors.
