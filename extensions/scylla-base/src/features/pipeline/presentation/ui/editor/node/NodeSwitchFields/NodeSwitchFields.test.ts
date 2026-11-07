import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { findFloating, render } from '@test/render.ts';
import type { SwitchPipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import Fixture from './NodeSwitchFields.fixture.svelte';

const rule = {
  left: { kind: 'var', name: 'SCYLLA_BRANCH' },
  test: 'equals',
  right: { kind: 'literal', value: 'main' },
} as const;

const node: SwitchPipelineNodeEntity = {
  id: 'pick',
  deps: [],
  env: [{ key: 'TARGET', kind: 'literal', value: 'main' }],
  kind: 'switch',
  cases: [
    { port: 'case-1', combinator: 'all', rules: [rule] },
    { port: 'case-2', combinator: 'all', rules: [rule] },
  ],
  otherwise: 'false',
  allMatches: false,
};

const onChange = vi.fn();
beforeEach(() => onChange.mockClear());

const renderForm = () => render(Fixture, { node, outputNodes: ['build', 'test'], onChange });
const lastValue = () => onChange.mock.lastCall?.[0] as SwitchPipelineNodeEntity;
const caseBlock = (port: string) => screen.getByRole('region', { name: port });

describe('NodeSwitchFields', () => {
  it('renames the port of a case when the field is left, and says which port it renames', async () => {
    const user = userEvent.setup();
    renderForm();

    const port = within(caseBlock('case-1')).getByRole('textbox', { name: 'Port name' });
    await user.clear(port);
    await user.type(port, 'is-main');
    expect(onChange).not.toHaveBeenCalled();
    await user.tab();

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cases: [expect.objectContaining({ port: 'is-main' }), expect.anything()],
      }),
      { from: 'case-1', to: 'is-main' },
    );
  });

  it('says that error is reserved as it is typed, and keeps the old name when the field is left', async () => {
    const user = userEvent.setup();
    renderForm();

    const port = within(caseBlock('case-1')).getByRole('textbox', { name: 'Port name' });
    await user.clear(port);
    await user.type(port, 'error');

    expect(port).toHaveAttribute('aria-invalid', 'true');
    expect(port).toHaveAccessibleDescription(
      'The port name "error" is for the error output of a node that runs a step. Use another name.',
    );
    await user.tab();

    expect(onChange).not.toHaveBeenCalled();
    expect(port).toHaveValue('case-1');
    expect(port).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('says why a port name with refused characters is not valid', async () => {
    const user = userEvent.setup();
    renderForm();

    const port = screen.getByRole('textbox', { name: 'Port when no case matches' });
    await user.clear(port);
    await user.type(port, 'No');

    expect(port).toHaveAccessibleDescription(
      'The port "No" is not valid. Use 1 to 128 lowercase letters (a-z), digits, - and _.',
    );
  });

  it('changes the order of the cases, adds one and deletes one', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Move the case case-1 down' }));
    expect(lastValue().cases.map(c => c.port)).toEqual(['case-2', 'case-1']);

    await user.click(screen.getByRole('button', { name: 'Add a case' }));
    expect(lastValue().cases.map(c => c.port)).toEqual(['case-2', 'case-1', 'case-3']);

    await user.click(screen.getByRole('button', { name: 'Delete the case case-2' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), { from: 'case-2', to: null });
  });

  it('switches a case to Any, and adds a rule to it', async () => {
    const user = userEvent.setup();
    renderForm();
    const block = caseBlock('case-2');

    await user.click(within(block).getByRole('radio', { name: 'Any' }));
    await user.click(within(block).getByRole('button', { name: 'Add a rule' }));

    expect(lastValue().cases[1]).toMatchObject({
      combinator: 'any',
      rules: [rule, expect.anything()],
    });
  });

  it('hides the right value for a test with none', async () => {
    const user = userEvent.setup();
    renderForm();
    const block = caseBlock('case-1');
    expect(within(block).getByRole('textbox', { name: 'Right value' })).toHaveValue('main');

    await user.click(within(block).getByRole('combobox', { name: 'Test' }));
    await user.click(await findFloating('option', 'is empty'));

    expect(within(block).queryByRole('textbox', { name: 'Right value' })).not.toBeInTheDocument();
    expect(lastValue().cases[0].rules[0]).toEqual({ left: rule.left, test: 'empty' });
  });

  it('reads an output of a node that runs a step before the switch, and a free key', async () => {
    const user = userEvent.setup();
    renderForm();
    const block = caseBlock('case-1');

    await user.click(within(block).getByRole('combobox', { name: 'Kind of the left value' }));
    await user.click(await findFloating('option', 'Output'));
    await user.click(within(block).getByRole('combobox', { name: 'Node of the output' }));
    // The options of the hints of a variable have no text.
    const names = screen
      .getAllByRole('option', { hidden: true })
      .map(option => option.textContent?.trim());
    expect(names.filter(Boolean)).toEqual(['build', 'test']);
    await user.click(await findFloating('option', 'test'));
    await user.type(within(block).getByRole('textbox', { name: 'Key of the output' }), 'TAG');

    expect(lastValue().cases[0].rules[0].left).toEqual({
      kind: 'output',
      node: 'test',
      key: 'TAG',
    });
  });

  it('gives a variable the env names of the node as hints', () => {
    const { container } = renderForm();
    // A field with hints is a combobox.
    const field = within(caseBlock('case-1')).getByRole('combobox', { name: 'Left value' });

    const hints = container.querySelector(`datalist#${field.getAttribute('list')}`);
    expect([...(hints?.querySelectorAll('option') ?? [])].map(option => option.value)).toEqual([
      'TARGET',
    ]);
  });

  it('opens each case that matches, and turns otherwise off with the needs on it', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(
      screen.getByRole('switch', { name: 'Open the port of each case that matches' }),
    );
    expect(lastValue().allMatches).toBe(true);

    await user.click(screen.getByRole('switch', { name: 'Open a port when no case matches' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.not.objectContaining({ otherwise: 'false' }), {
      from: 'false',
      to: null,
    });
    expect(
      screen.queryByRole('textbox', { name: 'Port when no case matches' }),
    ).not.toBeInTheDocument();
  });
});
