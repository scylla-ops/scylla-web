import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import { render } from '@test/render.ts';
import TriggerKindSelect from './TriggerKindSelect.svelte';

describe('TriggerKindSelect', () => {
  it('shows the label of the kind on the first render, before the list opens', () => {
    render(TriggerKindSelect, { value: 'cron', onChange: vi.fn(), onLinkRepository: vi.fn() });

    expect(screen.getByRole('combobox')).toHaveTextContent('Schedule');
    expect(screen.getByRole('combobox')).not.toHaveTextContent('cron');
  });
});
