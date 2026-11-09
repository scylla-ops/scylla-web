import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render } from '@test/render.ts';
import { appChoice, memberChoice } from '../../../presenters/actor-choice.presenter.ts';
import ChooseActorRow from './ChooseActorRow.svelte';

const ada = memberChoice(
  { actorId: 'u-1', name: 'Ada Lovelace', handle: 'ada', kind: 'person' },
  { id: 'u-1', username: 'ada', displayName: 'Ada Lovelace', email: 'ada@acme.dev' },
);
const linus = memberChoice({ actorId: 'u-2', name: 'Linus', handle: 'torvalds', kind: 'person' });
const runner = appChoice({ id: 'app-1', name: 'ci-runner', runner: true });
const github = appChoice({ id: 'app-2', name: 'github-ci', runner: false });
const choices = [ada, linus, runner, github];

const field = () => screen.getByRole<HTMLInputElement>('combobox', { name: 'Member' });

const options = () => screen.findAllByRole('option', { hidden: true });

const kindOf = (element: HTMLElement) =>
  element.querySelector('[data-kind]')?.getAttribute('data-kind');

const setup = (props: Partial<{ choices: typeof choices; loading: boolean }> = {}) => {
  const onChoose = vi.fn();
  const onCancel = vi.fn();
  render(ChooseActorRow, { choices, onChoose, onCancel, ...props });
  return { onChoose, onCancel };
};

describe('ChooseActorRow', () => {
  it('takes the focus when it appears: the user can type at once', async () => {
    setup();

    await waitFor(() => expect(field()).toHaveFocus());
  });

  it('shows each actor with its avatar and its kind', async () => {
    setup();

    await userEvent.click(field());
    const [first, second, third, fourth] = await options();

    expect(first).toHaveTextContent('Ada Lovelace');
    expect(first).toHaveTextContent('ada@acme.dev');
    expect(second).toHaveTextContent('@torvalds');
    expect(third).toHaveTextContent('ci-runner');
    expect(third).toHaveTextContent('Agent');
    expect(fourth).toHaveTextContent('github-ci');
    expect(fourth).toHaveTextContent('App');
    expect([first, second, third, fourth].map(kindOf)).toEqual([
      'person',
      'person',
      'agent',
      'app',
    ]);
  });

  it.each([
    ['the name', 'lovel', 'Ada Lovelace'],
    ['the handle', 'torv', 'Linus'],
    ['the email', 'acme', 'Ada Lovelace'],
    ['the name of an app', 'runner', 'ci-runner'],
  ])('finds a member by %s', async (_, search, name) => {
    setup();

    await userEvent.type(field(), search);

    const shown = await options();
    expect(shown).toHaveLength(1);
    expect(shown[0]).toHaveTextContent(name);
  });

  it('shows the chosen member as a chip, and gives it on the next step', async () => {
    const { onChoose } = setup();
    const next = screen.getByRole('button', { name: 'Choose a role' });
    expect(next).toBeDisabled();

    await userEvent.type(field(), 'runner{Enter}');

    const remove = await screen.findByRole('button', { name: 'Remove ci-runner' });
    expect(kindOf(remove.parentElement as HTMLElement)).toBe('agent');
    expect(field().value).toBe('');
    await userEvent.click(next);

    expect(onChoose).toHaveBeenCalledWith(runner);
  });

  it('drops the choice with the button of the chip', async () => {
    setup();
    await userEvent.type(field(), 'torv{Enter}');

    await userEvent.click(await screen.findByRole('button', { name: 'Remove Linus' }));

    expect(screen.getByRole('button', { name: 'Choose a role' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Remove Linus' })).not.toBeInTheDocument();
  });

  it('says when no member matches', async () => {
    setup();

    await userEvent.type(field(), 'zzz');

    expect(screen.getByRole('status')).toHaveTextContent('No match');
  });

  it('says when nobody is left', async () => {
    setup({ choices: [] });

    await userEvent.click(field());

    expect(screen.getByRole('status')).toHaveTextContent('No member left to add');
  });

  it('says that apps still load', async () => {
    setup({ choices: [], loading: true });

    await userEvent.click(field());

    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });
});
