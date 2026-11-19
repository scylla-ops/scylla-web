import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { contextStore } from '@platform/context';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import type { FragmentEntity } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
import FragmentLibraryPage from './FragmentLibrary.page.svelte';

const fragment = (id: string, name: string, tags: string[], favorite = false): FragmentEntity => ({
  id,
  workspaceId: 'ws-1',
  name,
  description: `${name} for the crates.`,
  tags,
  author: { id: 'rem', name: 'Rem' },
  versions: [
    {
      number: 1,
      nodes: [{ id: 'fmt', deps: [], kind: 'exec', command: 'cargo', args: ['fmt'], env: [] }],
      parameters: [],
      changes: [],
      author: { id: 'rem', name: 'Rem' },
      publishedAt: '2026-01-01T10:00:00Z',
    },
  ],
  favorite,
  usages: [],
});

const LIBRARY = [
  fragment('f1', 'rust-ci', ['rust', 'ci'], true),
  fragment('f2', 'docker-publish', ['docker']),
];

let teardown: Array<() => void> = [];

const renderPage = (fragments: FragmentEntity[]) => {
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({ pipeline: { fragmentRepository: { list: () => Promise.resolve(fragments) } } }),
  ];
  return render(FragmentLibraryPage);
};

const cardNames = () => screen.queryAllByRole('link').map(link => link.textContent?.trim());

beforeEach(() => contextStore.setState({ workspace: { id: 'ws-1', name: 'acme', slug: 'acme' } }));

afterEach(() => teardown.forEach(restore => restore()));

describe('FragmentLibraryPage', () => {
  it('shows a card for each fragment of the workspace', async () => {
    renderPage(LIBRARY);

    expect(await screen.findByRole('link', { name: 'rust-ci' })).toBeInTheDocument();
    expect(cardNames()).toEqual(['docker-publish', 'rust-ci']);
  });

  it('narrows the cards to a search, then to a tag', async () => {
    renderPage(LIBRARY);
    await screen.findByRole('link', { name: 'rust-ci' });

    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Search the acme library' }),
      'docker',
    );
    expect(cardNames()).toEqual(['docker-publish']);

    await userEvent.clear(screen.getByRole('searchbox'));
    const tags = screen.getByRole('group', { name: 'Tags' });
    await userEvent.click(within(tags).getByRole('button', { name: 'rust' }));
    expect(cardNames()).toEqual(['rust-ci']);
  });

  it('keeps the favorites in their tab, and the community tab for later', async () => {
    renderPage(LIBRARY);
    await screen.findByRole('link', { name: 'rust-ci' });

    await userEvent.click(screen.getByRole('tab', { name: 'Favorites' }));

    expect(cardNames()).toEqual(['rust-ci']);
    expect(screen.getByRole('tab', { name: /Community/ })).toBeDisabled();
  });

  it('tells how to fill an empty library', async () => {
    renderPage([]);

    expect(await screen.findByText(/The library is empty/)).toBeInTheDocument();
  });
});
