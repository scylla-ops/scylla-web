/**
 * Copies the protos of the backend into `protos/scylla`, until the backend repository has the
 * branch that `protos/` can pin as a submodule.
 *
 * Usage:
 *   node scripts/sync-protos.mjs <path to the ce/proto folder of the backend>
 */

import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = process.argv[2];
if (!source || !existsSync(join(source, 'scylla'))) {
  console.error('usage: node scripts/sync-protos.mjs <path to ce/proto>');
  process.exit(2);
}

const target = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'protos', 'scylla');
rmSync(target, { recursive: true, force: true });
cpSync(join(source, 'scylla'), target, { recursive: true });
console.log(`Copied ${join(source, 'scylla')} to ${target}.`);
