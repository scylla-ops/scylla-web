import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import { render, withQueryClient, withRegistry } from '@test/render.svelte.ts';
import { ScyllaError, ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { InstalledExtension } from '../../../domain/structs/installed-extension.struct.ts';
import ExtensionsPage from './Extensions.page.svelte';

const extension = (overrides: Partial<InstalledExtension> = {}): InstalledExtension => ({
  id: 'scylla-base',
  name: 'Scylla',
  version: '0.4.0',
  dependencies: [],
  moduleCount: 1,
  pageCount: 12,
  ...overrides,
});

let getInstalledExtensions: ReturnType<typeof vi.fn>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;

beforeEach(() => {
  getInstalledExtensions = vi.fn();
  cache = withQueryClient();
  restoreRegistry = withRegistry({ extensions: { extensionRepository: { getInstalledExtensions } } });
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
});

describe('ExtensionsPage', () => {
  it('shows one card per installed extension, with its version and counts', async () => {
    getInstalledExtensions.mockResolvedValue(
      ScyllaResult.success([
        extension(),
        extension({ id: 'scylla-cloud', name: 'Scylla Cloud', dependencies: ['scylla-base'] }),
      ]),
    );

    render(ExtensionsPage);

    expect(await screen.findByText('Scylla Cloud')).toBeInTheDocument();
    expect(screen.getByText('Scylla')).toBeInTheDocument();
    expect(screen.getAllByText('v0.4.0')).toHaveLength(2);
    expect(screen.getAllByText(/1 module ·/)).toHaveLength(2);
  });

  it('names the dependencies of an extension, and says so when it has none', async () => {
    getInstalledExtensions.mockResolvedValue(
      ScyllaResult.success([extension({ id: 'cloud', dependencies: ['scylla-base'] })]),
    );

    render(ExtensionsPage);

    expect(await screen.findByText('Depends on')).toBeInTheDocument();
    expect(screen.getByText('scylla-base')).toBeInTheDocument();
    expect(screen.queryByText('No dependency')).not.toBeInTheDocument();
  });

  it('shows the error state when the extensions cannot be read', async () => {
    getInstalledExtensions.mockResolvedValue(ScyllaResult.error(new ScyllaError('boom')));

    render(ExtensionsPage);

    expect(
      await screen.findByText('The installed extensions could not be read.'),
    ).toBeInTheDocument();
  });
});
