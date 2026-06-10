# Repository Settings

## Distribution

The public distribution path is a rolling GitHub Release:

- Workflow: `.github/workflows/release-main.yml`
- Trigger: every push to `main`
- Tag: `main-latest`
- Asset: `pokelike-companion-extension.zip`

Users can download the zip, extract it, and load the extracted folder as an unpacked Chrome extension.

## Branch Protection

Active policy for `main`:

- Require pull requests.
- Require 1 approving review.
- Dismiss stale reviews on new pushes.
- Require status check `build`.
- Require branches to be up to date before merge.
- Require linear history.
- Require conversation resolution.
- Block force pushes and deletion.
- Delete branches after merge.
- Admin enforcement disabled so the repository owner can bypass review requirements when needed.

The repo is configured to delete branches after merge, disable wiki/projects, and keep issues enabled.

Available repository-level settings already applied:

- Public repository.
- Default branch: `main`.
- Issues enabled.
- Wiki disabled.
- Projects disabled.
- Delete branches after merge enabled.
- Squash merge enabled.
- Merge commits disabled.
- Rebase merges disabled.
- Security policy present.

Classic branch protection command:

```bash
gh api --method PUT /repos/julianariel/pokelike-companion/branches/main/protection --input protection.json
```

Ruleset alternative:

```bash
gh api --method POST /repos/julianariel/pokelike-companion/rulesets --input ruleset.json
```
