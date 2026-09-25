// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { ExtensionManifest, ScyllaModule } from '@scylla/core-sdk';
import { DefaultExtensionRepository } from '../default-extension.repository.ts';

const page = () => Promise.resolve({ default: (() => undefined) as never });

const manifest = (overrides: Partial<ExtensionManifest> = {}): ExtensionManifest => ({
  id: 'scylla-base',
  name: 'Scylla',
  version: '0.4.0',
  modules: [],
  ...overrides,
});

const read = async (manifests: readonly ExtensionManifest[]) =>
  (await new DefaultExtensionRepository(() => manifests).getInstalledExtensions()).unwrap();

describe('DefaultExtensionRepository', () => {
  it('keeps the load order of the core', async () => {
    const extensions = await read([manifest(), manifest({ id: 'cloud', name: 'Cloud' })]);

    expect(extensions.map(extension => extension.id)).toEqual(['scylla-base', 'cloud']);
  });

  it('gives an empty dependency list to an extension that declares none', async () => {
    const [extension] = await read([manifest()]);

    expect(extension.dependencies).toEqual([]);
  });

  it('counts the pages of every mount and of the child routes, not the groups or redirects', async () => {
    const module: ScyllaModule = {
      id: 'a',
      domain: {},
      routes: {
        organization: [
          { path: 'list', page, children: [{ path: ':id', page }] },
          { path: 'group', children: [{ path: 'x', page }] },
          { redirect: 'list' },
        ],
        project: [{ path: 'y', page }],
      },
    };

    const [extension] = await read([manifest({ modules: [module, { id: 'b', domain: {} }] })]);

    expect(extension.moduleCount).toBe(2);
    expect(extension.pageCount).toBe(4);
  });

  it('reads the installed extensions per call, since the core installs them after this module loads', async () => {
    let installed: readonly ExtensionManifest[] = [];
    const repository = new DefaultExtensionRepository(() => installed);

    installed = [manifest()];

    expect((await repository.getInstalledExtensions()).unwrap()).toHaveLength(1);
  });
});
