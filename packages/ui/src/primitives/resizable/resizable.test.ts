import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/svelte';
import { render } from '@test/render.ts';
import ResizableFixture from './resizable.fixture.svelte';

describe('Resizable', () => {
  it('names its handle "Resize panel" as a separator', () => {
    render(ResizableFixture);

    expect(screen.getByRole('separator', { name: 'Resize panel' })).toBeInTheDocument();
  });

  it('lets the caller replace the name of the handle', () => {
    render(ResizableFixture, { label: 'Resize the list' });

    expect(screen.getByRole('separator', { name: 'Resize the list' })).toBeInTheDocument();
    expect(screen.queryByRole('separator', { name: 'Resize panel' })).toBeNull();
  });
});
