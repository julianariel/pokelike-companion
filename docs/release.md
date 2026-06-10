# Release Process

## Release Types

The project publishes two release tracks:

- `main-latest`: rolling prerelease updated on every push to `main`.
- `vX.Y.Z`: immutable versioned release created once for each new `package.json` version.

The rolling release is convenient for the latest install link. Versioned releases are the stable historical builds players and contributors can reference.

## Version Source

`package.json` is the source of truth for the extension version.

`public/manifest.json` must match `package.json`.

Checks:

```bash
npm run version:check
```

Sync after bumping:

```bash
npm run version:sync
```

## Bump Flow

1. Create a branch.
2. Bump `package.json` with npm:

   ```bash
   npm version patch --no-git-tag-version
   ```

3. Sync the Chrome manifest:

   ```bash
   npm run version:sync
   ```

4. Update release-facing docs or notes if needed.
5. Open a pull request.
6. Merge to `main` after CI passes.

On merge, `.github/workflows/release-main.yml` will:

- build the extension
- package `dist/`
- update `main-latest`
- create `vX.Y.Z` if it does not already exist
- attach `pokelike-companion-extension.zip`
- write release notes from commit history

If `vX.Y.Z` already exists, the workflow leaves that release unchanged and only updates `main-latest`.
