import { describe, it, expect } from 'vitest';
import { render } from '@test/render.ts';
import ProviderMark from './ProviderMark.svelte';

describe('ProviderMark', () => {
  it('shows the mark of a GitHub provider', () => {
    const { container } = render(ProviderMark, { kind: 'github' });

    expect(container.querySelector('[data-provider-mark="github"]')).toBeInTheDocument();
  });

  it('shows nothing for a kind with no mark', () => {
    const { container } = render(ProviderMark, { kind: 'oidc' });

    expect(container.querySelector('[data-provider-mark]')).not.toBeInTheDocument();
  });
});
