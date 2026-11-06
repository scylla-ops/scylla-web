import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { findFloating, render } from '@test/render.ts';
import { memberChoice } from '../../../presenters/actor-choice.presenter.ts';
import ChooseActorRow from './ChooseActorRow.svelte';

const ada = memberChoice(
  { actorId: 'u-1', name: 'Ada Lovelace', handle: 'ada' },
  { id: 'u-1', username: 'ada', displayName: 'Ada Lovelace', email: 'ada@acme.dev' },
);
const linus = memberChoice({ actorId: 'u-2', name: 'Linus', handle: 'torvalds' });
const ci = { id: 'app-1', name: 'ci-runner' };
const choices = [ada, linus, ci];

const field = () => screen.getByRole<HTMLInputElement>('combobox', { name: 'Member' });

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

  it('shows the email, or the handle when the directory gives no email', async () => {
    setup();

    await userEvent.click(field());

    await findFloating('option', 'Ada Lovelace ada@acme.dev');
    await findFloating('option', 'Linus @torvalds');
    await findFloating('option', 'ci-runner');
  });

  it.each([
    ['the name', 'lovel', 'Ada Lovelace ada@acme.dev'],
    ['the handle', 'torv', 'Linus @torvalds'],
    ['the email', 'acme', 'Ada Lovelace ada@acme.dev'],
    ['the name of an app', 'runner', 'ci-runner'],
  ])('finds a member by %s', async (_, search, row) => {
    setup();

    await userEvent.type(field(), search);

    expect(
      (await screen.findAllByRole('option', { hidden: true })).map(one => one.textContent.trim()),
    ).toEqual([row]);
  });

  it('gives the member chosen with the keyboard', async () => {
    const { onChoose } = setup();
    const next = screen.getByRole('button', { name: 'Choose a role' });
    expect(next).toBeDisabled();

    await userEvent.type(field(), 'torv{Enter}');
    await userEvent.click(next);

    expect(onChoose).toHaveBeenCalledWith(linus);
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
