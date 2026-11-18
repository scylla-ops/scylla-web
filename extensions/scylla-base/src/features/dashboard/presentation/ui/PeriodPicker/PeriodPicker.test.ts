import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { findFloating, render } from '@test/render.ts';
import type { DashboardPeriod } from '@base/features/dashboard/presentation/presenters/period.presenter.ts';
import PeriodPicker from './PeriodPicker.svelte';

const CUSTOM: DashboardPeriod = { kind: 'custom', from: '2026-11-04', to: '2026-11-17' };

const renderPicker = (period: DashboardPeriod) => {
  const onSelect = vi.fn();
  const onApplyCustom = vi.fn();
  const view = render(PeriodPicker, {
    period,
    today: () => '2026-11-17',
    onSelect,
    onApplyCustom,
  });
  return { ...view, onSelect, onApplyCustom };
};

describe('PeriodPicker', () => {
  it('offers the periods of the design and checks the current one', () => {
    renderPicker({ kind: '14d' });

    const group = screen.getByRole('group', { name: 'Period' });
    expect(group).toHaveTextContent('24 h 7 d 14 d 30 d Custom');
    expect(screen.getByRole('radio', { name: '14 d' })).toHaveAttribute('aria-checked', 'true');
  });

  it('selects a preset period', async () => {
    const { onSelect } = renderPicker({ kind: '14d' });

    await userEvent.click(screen.getByRole('radio', { name: '7 d' }));

    expect(onSelect).toHaveBeenCalledWith('7d');
  });

  it('shows the days of a custom period on its button, and no button for a preset', () => {
    const { rerender } = renderPicker({ kind: '14d' });
    expect(screen.queryByRole('button', { name: /Nov/ })).toBeNull();

    void rerender({ period: CUSTOM });

    expect(screen.getByRole('button', { name: 'Nov 4 – Nov 17' })).toBeInTheDocument();
  });

  it('applies the days of the form', async () => {
    const user = userEvent.setup();
    const { onApplyCustom } = renderPicker(CUSTOM);

    await user.click(screen.getByRole('button', { name: 'Nov 4 – Nov 17' }));
    const first = await screen.findByLabelText('First day');
    await user.clear(first);
    await user.type(first, '2026-11-10');
    await user.click(await findFloating('button', 'Apply'));

    expect(onApplyCustom).toHaveBeenCalledWith('2026-11-10', '2026-11-17');
  });

  it('refuses a first day after the last day, and says why', async () => {
    const user = userEvent.setup();
    const { onApplyCustom } = renderPicker(CUSTOM);

    await user.click(screen.getByRole('button', { name: 'Nov 4 – Nov 17' }));
    const last = await screen.findByLabelText('Last day');
    await user.clear(last);
    await user.type(last, '2026-11-01');

    expect(await findFloating('alert')).toHaveTextContent('The first day is after the last day.');
    expect(await findFloating('button', 'Apply')).toBeDisabled();
    expect(onApplyCustom).not.toHaveBeenCalled();
  });
});
