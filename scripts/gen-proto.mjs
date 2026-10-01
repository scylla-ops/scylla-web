import { execSync } from 'node:child_process';
import {
  existsSync,
  rmSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
} from 'node:fs';
import { resolve, dirname, delimiter, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const protoDir = resolve(root, 'protos');

// Use the project-local @protobuf-ts protoc wrapper (which auto-wires the
// protoc-gen-ts plugin and emits the *.client.ts layout the source imports).
// A bare `protoc` on PATH may resolve to a different plugin (e.g. a homebrew
// protoc-gen-ts) and produce an incompatible single-file layout.
const protoc = resolve(root, 'node_modules', '.bin', 'protoc');
const binDir = resolve(root, 'node_modules', '.bin');

// Enumerate .proto files in JS rather than relying on a shell glob: cmd.exe on
// Windows does not expand `*.proto`, so the glob would be passed to protoc
// verbatim and fail. The tree is walked recursively because each proto lives in
// the directory that mirrors its package (`scylla/job/v1/job.proto`), never at
// the root.
function collectProtos(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return collectProtos(full);
    return entry.endsWith('.proto') ? [full] : [];
  });
}

const allProtos = existsSync(protoDir) ? collectProtos(protoDir) : [];
if (allProtos.length === 0) {
  console.error(
    `No .proto file in ${protoDir}. The scylla-protos submodule is not checked out.\n` +
      'Run: git submodule update --init',
  );
  process.exit(1);
}

// protobuf-ts emits well-known-type helpers (e.g. google/protobuf/timestamp.ts)
// whose method signatures carry parameters they don't use. Our tsconfig enables
// `noUnusedParameters`, which would flag this *generated* code. Prepend
// `// @ts-nocheck` to every generated file so machine output stays out of the
// strict app lint while its type declarations remain importable. Re-applied on
// every regeneration, so the generated tree never needs hand-editing.
function prependTsNoCheck(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      prependTsNoCheck(full);
    } else if (entry.endsWith('.ts')) {
      const source = readFileSync(full, 'utf8');
      if (!source.startsWith('// @ts-nocheck')) {
        writeFileSync(full, `// @ts-nocheck\n${source}`);
      }
    }
  }
}

// One target per extension that talks to the backend directly. Each gets only
// the proto packages it uses, generated into its own `src/generated/` — kept
// private to it the same way the rest of its internals are
// (`extension-uses-sdks`, `sdk-is-the-door`): no extension imports another
// one's generated client. A package used by two targets (`common`) is
// generated twice on purpose, once per extension: see `scylla-cloud-v1_plan.md`
// §2.5. Keep this list and `.dependency-cruiser.cjs`'s generated-folder
// exclusions (`extensions/*/src/generated/`) extension-agnostic together.
const targets = [
  { extension: 'scylla-base', protos: ['scylla'] },
  { extension: 'scylla-cloud', protos: ['scylla/registration/v1', 'scylla/common/v1'] },
];

const protosUnder = (prefix) => {
  const matches = allProtos.filter((file) => {
    const relPath = relative(protoDir, file).split(sep).join('/');
    return relPath === `${prefix}.proto` || relPath.startsWith(`${prefix}/`);
  });
  if (matches.length === 0) {
    console.error(`No .proto file matches "${prefix}".`);
    process.exit(1);
  }
  return matches;
};

for (const target of targets) {
  const outDir = resolve(root, 'extensions', target.extension, 'src', 'generated');
  const protoFiles = [...new Set(target.protos.flatMap(protosUnder))];

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const fileArgs = protoFiles.map((f) => `"${f}"`).join(' ');
  const cmd = `"${protoc}" -I="${protoDir}" --ts_out="${outDir}" ${fileArgs}`;

  // protoc resolves the protoc-gen-ts plugin from PATH; ensure node_modules/.bin
  // is on it so the local plugin is found (cross-platform).
  execSync(cmd, {
    stdio: 'inherit',
    shell: true,
    cwd: root,
    env: { ...process.env, PATH: `${binDir}${delimiter}${process.env.PATH ?? ''}` },
  });

  prependTsNoCheck(outDir);
  console.log(`Protobuf generation done for "${target.extension}" (${protoFiles.length} file(s)).`);
}
