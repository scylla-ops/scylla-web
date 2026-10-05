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
// scylla-web itself, wherever the host workspace mounts it. The host is the
// folder the command runs from: scylla-web, or a private repo that has it as a
// submodule.
const scyllaRoot = resolve(__dirname, '..');
const hostRoot = process.cwd();

// Use the project-local @protobuf-ts protoc wrapper (which auto-wires the
// protoc-gen-ts plugin and emits the *.client.ts layout the source imports).
// A bare `protoc` on PATH may resolve to a different plugin (e.g. a homebrew
// protoc-gen-ts) and produce an incompatible single-file layout.
const binDir = resolve(hostRoot, 'node_modules', '.bin');
const protoc = resolve(binDir, 'protoc');

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

// One target per extension that talks to the backend directly. An extension
// declares it in its `package.json`:
//
//   "scylla": { "protos": ["scylla/registration/v1"], "protoRoot": "../../protos" }
//
// `protos` lists the proto packages it uses; `protoRoot`, relative to the
// extension, is where they are (default: the `protos/` submodule of
// scylla-web). Each extension gets only those packages, generated into its own
// `src/generated/` — kept private to it the same way the rest of its internals
// are (`extension-uses-sdks`, `sdk-is-the-door`): no extension imports another
// one's generated client. A package used by two extensions (`common`) is
// generated twice on purpose, once per extension.
const extensionDirs = [
  resolve(hostRoot, 'extensions'),
  ...(scyllaRoot === hostRoot ? [] : [resolve(scyllaRoot, 'extensions')]),
]
  .filter(existsSync)
  .flatMap((root) => readdirSync(root).map((name) => join(root, name)));

const targets = extensionDirs.flatMap((dir) => {
  const manifest = join(dir, 'package.json');
  if (!existsSync(manifest)) return [];
  const { scylla } = JSON.parse(readFileSync(manifest, 'utf8'));
  if (!scylla?.protos) return [];
  const protoDir = scylla.protoRoot ? resolve(dir, scylla.protoRoot) : resolve(scyllaRoot, 'protos');
  return [{ dir, protos: scylla.protos, protoDir }];
});

const protosUnder = (protoDir, allProtos, prefix) => {
  const matches = allProtos.filter((file) => {
    const relPath = relative(protoDir, file).split(sep).join('/');
    return relPath === `${prefix}.proto` || relPath.startsWith(`${prefix}/`);
  });
  if (matches.length === 0) {
    console.error(`No .proto file under ${protoDir} matches "${prefix}".`);
    process.exit(1);
  }
  return matches;
};

for (const target of targets) {
  const allProtos = existsSync(target.protoDir) ? collectProtos(target.protoDir) : [];
  if (allProtos.length === 0) {
    console.error(
      `No .proto file in ${target.protoDir}. The protos submodule is not checked out.\n` +
        'Run: git submodule update --init --recursive',
    );
    process.exit(1);
  }

  const outDir = resolve(target.dir, 'src', 'generated');
  const protoFiles = [...new Set(target.protos.flatMap((p) => protosUnder(target.protoDir, allProtos, p)))];

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const fileArgs = protoFiles.map((f) => `"${f}"`).join(' ');
  const cmd = `"${protoc}" -I="${target.protoDir}" --ts_out="${outDir}" ${fileArgs}`;

  // protoc resolves the protoc-gen-ts plugin from PATH; ensure node_modules/.bin
  // is on it so the local plugin is found (cross-platform).
  execSync(cmd, {
    stdio: 'inherit',
    shell: true,
    cwd: hostRoot,
    env: { ...process.env, PATH: `${binDir}${delimiter}${process.env.PATH ?? ''}` },
  });

  prependTsNoCheck(outDir);
  console.log(
    `Protobuf generation done for "${relative(hostRoot, target.dir)}" (${protoFiles.length} file(s)).`,
  );
}
