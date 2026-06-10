# Repository Settings

## Distribution

The private distribution path is a rolling GitHub Release:

- Workflow: `.github/workflows/release-main.yml`
- Trigger: every push to `main`
- Tag: `main-latest`
- Asset: `pokelike-companion-extension.zip`

Users can download the zip, extract it, and load the extracted folder as an unpacked Chrome extension.

## Branch Protection

Target policy for `main`:

- Require pull requests.
- Require 1 approving review.
- Dismiss stale reviews on new pushes.
- Require status check `build`.
- Require branches to be up to date before merge.
- Require linear history.
- Require conversation resolution.
- Block force pushes and deletion.
- Delete branches after merge.

The repo is already configured to delete branches after merge, disable wiki/projects, and keep issues enabled.

### Current GitHub Limitation

GitHub rejected both classic branch protection and repository rulesets for this private personal repository:

```text
Upgrade to GitHub Pro or make this repository public to enable this feature.
```

The protection can be applied once the account/repo supports protected private branches.

Classic branch protection command:

```bash
gh api --method PUT /repos/julianariel/pokelike-companion/branches/main/protection --input protection.json
```

Ruleset alternative:

```bash
gh api --method POST /repos/julianariel/pokelike-companion/rulesets --input ruleset.json
```
