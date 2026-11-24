import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import { contextStore } from '@platform/context';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import AdminBar from './AdminBar.svelte';

let teardown: Array<() => void> = [];

beforeEach(() => {
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({ workspace: { workspaceRepository: { getMine: () => Promise.resolve([]) } } }),
  ];
  contextStore.setState({ workspace: { id: 'org-1', name: 'Acme', slug: 'acme' } });
});

afterEach(() => {
  teardown.forEach(restore => restore());
});

describe('AdminBar', () => {
  it('names the server that the administration changes', () => {
    render(AdminBar);

    expect(screen.getByText(window.location.host)).toHaveAttribute('title', window.location.host);
  });

  it('goes back to the workspace, from a button', () => {
    render(AdminBar);

    expect(screen.getByRole('link', { name: 'Back to Acme' })).toHaveAttribute(
      'href',
      '/acme/dashboard',
    );
  });
});
