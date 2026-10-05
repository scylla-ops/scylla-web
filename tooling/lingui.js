import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scyllaRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Every `locales/` folder below `dir`, as the module folder that holds it. */
const modulesWithLocales = dir =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (!entry.isDirectory() || entry.name === 'node_modules' || entry.name === 'generated') {
      return [];
    }
    if (entry.name === 'locales') return [dir];
    return modulesWithLocales(join(dir, entry.name));
  });

/**
 * One Lingui catalog per module that has a `locales/` folder, found in the packages of the host
 * workspace and, when the host mounts scylla-web as a subfolder, in those of scylla-web.
 * `apps/` of scylla-web is left out: a host builds its own app.
 *
 * A host compiles the catalogs of scylla-web, but must not extract them: the origin comments of
 * the `.po` files would take its path prefix, and the submodule would change. Its extract config
 * passes `{ withScylla: false }`.
 */
export const scyllaCatalogs = (hostRoot, { withScylla = true } = {}) => {
  const mounted = scyllaRoot !== resolve(hostRoot);
  const roots = [
    ...['apps', 'packages', 'sdks', 'extensions'].map(folder => join(hostRoot, folder)),
    ...(mounted && withScylla
      ? ['packages', 'sdks', 'extensions'].map(folder => join(scyllaRoot, folder))
      : []),
  ];

  return roots
    .filter(existsSync)
    .flatMap(root => readdirSync(root).map(name => join(root, name, 'src')))
    .filter(existsSync)
    .flatMap(modulesWithLocales)
    .map(dir => relative(hostRoot, dir).split('\\').join('/'))
    .sort()
    .map(dir => ({
      path: `<rootDir>/${dir}/locales/{locale}/messages`,
      include: [`${dir}/`],
      // Tests declare routes and messages of their own, never shown to a user.
      exclude: ['**/*.test.ts'],
    }));
};
