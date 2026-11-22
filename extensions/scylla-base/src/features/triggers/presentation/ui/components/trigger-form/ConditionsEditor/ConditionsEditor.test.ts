import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { findFloating, render } from '@test/render.ts';
import type { WebhookCondition } from '@base/features/triggers/domain/structs/webhook-condition.struct.ts';
import ConditionsEditor from './ConditionsEditor.svelte';

const event: WebhookCondition = {
  source: 'header',
  field: 'X-GitHub-Event',
  operator: 'is',
  values: ['push'],
};

const ref: WebhookCondition = {
  source: 'jsonPointer',
  field: '/ref',
  operator: 'oneOf',
  values: ['refs/heads/main'],
};

describe('ConditionsEditor', () => {
  it('tells that each delivery starts a run when there is no condition', () => {
    render(ConditionsEditor, { conditions: [], onChange: vi.fn() });

    expect(screen.getByText('No condition: each delivery starts a run.')).toBeInTheDocument();
  });

  it('appends a blank condition on a header when "Add condition" is pressed', async () => {
    const onChange = vi.fn();
    render(ConditionsEditor, { conditions: [event], onChange });

    await userEvent.click(screen.getByRole('button', { name: 'Add condition' }));

    expect(onChange).toHaveBeenCalledWith([
      event,
      { source: 'header', field: '', operator: 'is', values: [] },
    ]);
  });

  it('puts "and" between two conditions, and removes the condition whose button was pressed', async () => {
    const onChange = vi.fn();
    render(ConditionsEditor, { conditions: [event, ref], onChange });

    expect(screen.getAllByText('and')).toHaveLength(1);
    await userEvent.click(screen.getAllByRole('button', { name: 'Remove condition' })[1]);

    expect(onChange).toHaveBeenCalledWith([event]);
  });

  it('shows the error of a pointer with no slash first when the field loses the focus', async () => {
    render(ConditionsEditor, {
      conditions: [{ ...ref, field: 'ref', operator: 'is', values: ['main'] }],
      onChange: vi.fn(),
    });
    const field = screen.getByLabelText('JSON pointer');
    expect(screen.queryByText('A JSON pointer starts with /, for example /ref.')).toBeNull();

    await userEvent.click(field);
    await userEvent.tab();

    expect(screen.getByText('A JSON pointer starts with /, for example /ref.')).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-invalid', 'true');
  });

  it('asks for a value when the value of a condition is left blank', async () => {
    render(ConditionsEditor, { conditions: [{ ...event, values: [] }], onChange: vi.fn() });

    await userEvent.click(screen.getByLabelText('Value'));
    await userEvent.tab();

    expect(screen.getByText('Give a value.')).toBeInTheDocument();
  });

  it('adds a value of "is one of" as a chip on Enter, and refuses a value already in the list', async () => {
    const onChange = vi.fn();
    render(ConditionsEditor, { conditions: [ref], onChange });

    await userEvent.type(screen.getByLabelText('Value'), 'refs/heads/dev{Enter}');
    expect(onChange).toHaveBeenLastCalledWith([
      { ...ref, values: ['refs/heads/main', 'refs/heads/dev'] },
    ]);

    onChange.mockClear();
    await userEvent.type(screen.getByLabelText('Value'), 'refs/heads/main{Enter}');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('This value is already in the list.')).toBeInTheDocument();
  });

  it('keeps the value when the comparison changes to "is one of"', async () => {
    const onChange = vi.fn();
    render(ConditionsEditor, { conditions: [event], onChange });

    await userEvent.click(screen.getByLabelText('Comparison'));
    await userEvent.click(await findFloating('option', 'is one of'));

    expect(onChange).toHaveBeenCalledWith([{ ...event, operator: 'oneOf', values: ['push'] }]);
  });
});
