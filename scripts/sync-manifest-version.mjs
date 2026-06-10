import { readFileSync, writeFileSync } from 'node:fs';

const checkOnly = process.argv.includes('--check');
const packageJsonPath = new URL('../package.json', import.meta.url);
const manifestPath = new URL('../public/manifest.json', import.meta.url);

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

if (manifest.version === packageJson.version) {
  console.log(`Manifest version ${manifest.version} matches package.json.`);
  process.exit(0);
}

if (checkOnly) {
  console.error(`Version mismatch: package.json is ${packageJson.version}, manifest is ${manifest.version}.`);
  console.error('Run `npm run version:sync` after bumping package.json.');
  process.exit(1);
}

manifest.version = packageJson.version;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Updated manifest version to ${packageJson.version}.`);
