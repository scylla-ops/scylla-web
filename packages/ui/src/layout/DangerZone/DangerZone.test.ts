import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/svelte';
import { render, textSnippet } from '@test/render.ts';
import DangerZone from './DangerZone.svelte';

describe('DangerZone', () => {
  it('is a region named by its title, which is a red heading', () => {
    render(DangerZone, { title: 'Danger zone', action: textSnippet('Delete') });

    const zone = screen.getByRole('region', { name: 'Danger zone' });
    const heading = screen.getByRole('heading', { level: 2, name: 'Danger zone' });
    expect(zone).toContainElement(heading);
    expect(heading).toHaveClass('text-destructive');
  });

  it('shows the description, the action and the content', () => {
    render(DangerZone, {
      title: 'Danger zone',
      description: 'This cannot be undone.',
      action: textSnippet('Delete'),
      children: textSnippet('Uninstall first.'),
    });

    const zone = screen.getByRole('region', { name: 'Danger zone' });
    expect(zone).toHaveTextContent('This cannot be undone.');
    expect(zone).toHaveTextContent('Delete');
    expect(zone).toHaveTextContent('Uninstall first.');
  });
});
