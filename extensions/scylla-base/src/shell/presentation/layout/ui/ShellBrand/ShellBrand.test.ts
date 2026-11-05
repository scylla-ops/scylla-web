import { afterEach, describe, expect, it } from 'vitest';
import { tick } from 'svelte';
import { screen } from '@testing-library/svelte';
import { contextStore } from '@platform/context';
import { render } from '@test/render.ts';
import ShellBrand from './ShellBrand.svelte';

const logoLink = () => screen.getByRole('link', { name: 'Scylla: open the dashboard' });

afterEach(() => contextStore.getState().reset());

describe('ShellBrand', () => {
  it('links to the dashboard of the current workspace', () => {
    contextStore.getState().setWorkspace('w-1', 'Acme Corp', 'acme-corp');

    render(ShellBrand);

    expect(logoLink()).toHaveAttribute('href', '/acme-corp/dashboard');
  });

  it('follows a change of workspace', async () => {
    contextStore.getState().setWorkspace('w-1', 'Acme Corp', 'acme-corp');
    render(ShellBrand);

    contextStore.getState().setWorkspace('w-2', 'Globex Inc', 'globex-inc');
    await tick();

    expect(logoLink()).toHaveAttribute('href', '/globex-inc/dashboard');
  });

  it('builds the link from the name of a context saved before the slugs', () => {
    contextStore.getState().setWorkspace('w-1', 'Acme Corp');

    render(ShellBrand);

    expect(logoLink()).toHaveAttribute('href', '/acme-corp/dashboard');
  });

  it('links to the root, which picks a workspace, with no current workspace', () => {
    render(ShellBrand);

    expect(logoLink()).toHaveAttribute('href', '/');
  });
});
