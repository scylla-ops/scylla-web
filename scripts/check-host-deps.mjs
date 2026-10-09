/**
 * Checks that a host repo, which mounts scylla-web as a submodule, runs the same third-party
 * versions as scylla-web.
 *
 * The packages of scylla-web declare their libraries as `peerDependencies`: the root of the
 * workspace provides them. In a host repo, that root is the host's `package.json`, so a version
 * that drifts from scylla-web's runs scylla-web's code on a library it was never tested with.
 * The same ranges are not enough: a fresh install resolves `^6.2.1` to whatever is latest, and
 * two copies of `@tanstack/query-core` break the types. So the resolved versions of both
 * lockfiles are compared too. To align them, seed the host lockfile from scylla-web's:
 *   cp scylla/pnpm-lock.yaml pnpm-lock.yaml && pnpm install
 *
 * Usage, from the host root:
 *   node scylla/scripts/check-host-deps.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const readManifest = path => JSON.parse(readFileSync(path, 'utf8'));

const scyllaRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scylla = readManifest(resolve(scyllaRoot, 'package.json'));
const host = readManifest(resolve(process.cwd(), 'package.json'));

/** `packages:` of a pnpm lockfile, as name -> Set<version>. */
const resolvedVersions = path => {
  const versions = new Map();
  const source = readFileSync(path, 'utf8');
  const section = source.slice(source.indexOf('\npackages:\n'), source.indexOf('\nsnapshots:\n'));
  for (const [, name, version] of section.matchAll(/^ {2}'?(@?[^@\s']+)@([^':(]+)'?:$/gm)) {
    if (!versions.has(name)) versions.set(name, new Set());
    versions.get(name).add(version);
  }
  return versions;
};

const all = manifest => ({ ...manifest.dependencies, ...manifest.devDependencies });
const hostDeps = all(host);

const problems = Object.entries(all(scylla))
  .filter(([, version]) => !version.startsWith('workspace:'))
  .flatMap(([name, version]) => {
    if (!(name in hostDeps)) return [`  ${name}: missing (scylla-web: ${version})`];
    if (hostDeps[name] !== version) {
      return [`  ${name}: ${hostDeps[name]} (scylla-web: ${version})`];
    }
    return [];
  });

const scyllaLock = resolvedVersions(resolve(scyllaRoot, 'pnpm-lock.yaml'));
const hostLock = resolvedVersions(resolve(process.cwd(), 'pnpm-lock.yaml'));
for (const [name, versions] of scyllaLock) {
  const extra = [...(hostLock.get(name) ?? [])].filter(version => !versions.has(version));
  if (extra.length > 0) {
    problems.push(`  ${name}: resolves ${extra.join(', ')} (scylla-web: ${[...versions].join(', ')})`);
  }
}

if (scylla.packageManager !== host.packageManager) {
  problems.push(`  packageManager: ${host.packageManager} (scylla-web: ${scylla.packageManager})`);
}

if (problems.length === 0) {
  console.log('\n✔ the host declares the same versions as scylla-web\n');
  process.exit(0);
}

console.log(`\n✖ ${problems.length} version(s) differ from scylla-web:\n`);
console.log(problems.join('\n'));
console.log(
  '\n  Copy the versions of scylla/package.json into the root package.json, then seed the' +
    '\n  lockfile: cp scylla/pnpm-lock.yaml pnpm-lock.yaml && pnpm install\n',
);
process.exit(1);
