import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { findFloating, render } from '@test/render.ts';
import SearchSelectFixture from './SearchSelect.fixture.svelte';
import type { SearchSelectOption } from './search-select.ts';

const options: SearchSelectOption[] = [
  { value: 'a', label: 'Local Admin', hint: '@local-admin' },
  { value: 'b', label: 'Sébastien', hint: 'seb@example.com', keywords: ['sebl'] },
  { value: 'c', label: 'test' },
  { value: 'd', label: 'Locked', disabled: true },
];

const field = () => screen.getByRole<HTMLInputElement>('combobox', { name: 'Member' });

const rows = async () =>
  (await screen.findAllByRole('option', { hidden: true })).map(row => row.textContent.trim());

const expectClosed = () =>
  waitFor(() => expect(field()).toHaveAttribute('aria-expanded', 'false'));

describe('SearchSelect', () => {
  it('opens the full list on a click', async () => {
    render(SearchSelectFixture, { options });

    await userEvent.click(field());

    expect(field()).toHaveAttribute('aria-expanded', 'true');
    expect(await rows()).toEqual([
      'Local Admin @local-admin',
      'Sébastien seb@example.com',
      'test',
      'Locked',
    ]);
  });

  it('shows only the rows that match the text', async () => {
    render(SearchSelectFixture, { options });

    await userEvent.type(field(), 'adm');

    expect(await rows()).toEqual(['Local Admin @local-admin']);
  });

  it('finds a row by its hint, by a keyword, and with no accent', async () => {
    render(SearchSelectFixture, { options });

    await userEvent.type(field(), 'example');
    expect(await rows()).toEqual(['Sébastien seb@example.com']);

    await userEvent.clear(field());
    await userEvent.type(field(), 'sebl');
    expect(await rows()).toEqual(['Sébastien seb@example.com']);

    await userEvent.clear(field());
    await userEvent.type(field(), 'sebastien');
    expect(await rows()).toEqual(['Sébastien seb@example.com']);
  });

  it('picks the first match with Enter, and shows its label', async () => {
    const onPick = vi.fn();
    render(SearchSelectFixture, { options, onPick });

    await userEvent.type(field(), 'tes{Enter}');

    expect(onPick).toHaveBeenCalledWith('c');
    await expectClosed();
    expect(field().value).toBe('test');
  });

  it('moves with the arrows, then picks the highlighted row', async () => {
    const onPick = vi.fn();
    render(SearchSelectFixture, { options, onPick });

    await userEvent.tab();
    await userEvent.keyboard('{ArrowDown}');
    await findFloating('option', 'test');
    await userEvent.keyboard('{ArrowDown}{Enter}');

    expect(onPick).toHaveBeenCalledWith('b');
  });

  it('skips a disabled row', async () => {
    const onPick = vi.fn();
    render(SearchSelectFixture, { options, onPick });

    await userEvent.type(field(), 'loc{ArrowDown}{Enter}');

    expect(onPick).toHaveBeenCalledWith('a');
  });

  it('points the field at the highlighted row and at the list', async () => {
    render(SearchSelectFixture, { options });

    await userEvent.type(field(), 'tes');

    const row = await findFloating('option', 'test');
    await waitFor(() => expect(field()).toHaveAttribute('aria-activedescendant', row.id));
    expect(field()).toHaveAttribute('aria-autocomplete', 'list');
    expect(field()).toHaveAttribute(
      'aria-controls',
      (await findFloating('listbox')).id,
    );
  });

  it('says "No match", keeps the list and the text on Enter, and picks nothing', async () => {
    const onPick = vi.fn();
    render(SearchSelectFixture, { options, onPick });

    await userEvent.type(field(), 'zzz{Enter}');

    expect(screen.getByRole('status')).toHaveTextContent('No match');
    expect(field()).toHaveAttribute('aria-expanded', 'true');
    expect(field().value).toBe('zzz');
    expect(onPick).not.toHaveBeenCalled();
  });

  it('says that rows still load, not "No match"', async () => {
    render(SearchSelectFixture, { options: [], loading: true });

    await userEvent.type(field(), 'a');

    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });

  it('gives its own line to a list with no option', async () => {
    render(SearchSelectFixture, { options: [], emptyText: 'Nobody to add' });

    await userEvent.click(field());

    expect(screen.getByRole('status')).toHaveTextContent('Nobody to add');
  });

  it('closes on Escape and shows the chosen label again', async () => {
    render(SearchSelectFixture, { options, initial: 'c' });
    expect(field().value).toBe('test');

    await userEvent.type(field(), 'adm');
    await userEvent.keyboard('{Escape}');

    await expectClosed();
    expect(field().value).toBe('test');
    expect(screen.getByTestId('value')).toHaveTextContent('c');
  });

  it('clears the text of a closed list when no value is chosen', async () => {
    render(SearchSelectFixture, { options });

    await userEvent.type(field(), 'adm');
    await userEvent.tab();

    await expectClosed();
    expect(field().value).toBe('');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'after' }));
  });

  it('opens with the full list again, also after a search', async () => {
    render(SearchSelectFixture, { options });

    await userEvent.type(field(), 'adm');
    await userEvent.keyboard('{Escape}');
    await expectClosed();
    await userEvent.click(field());

    expect(await rows()).toHaveLength(4);
  });

  it('keeps the value when the user picks the chosen row again', async () => {
    render(SearchSelectFixture, { options, initial: 'c' });

    await userEvent.click(field());
    await userEvent.click(await findFloating('option', 'test'));

    expect(screen.getByTestId('value')).toHaveTextContent('c');
  });

  it('shows no label after a pick when the owner clears its value', async () => {
    const onPick = vi.fn();
    render(SearchSelectFixture, { options, resets: true, onPick });

    await userEvent.click(field());
    await userEvent.click(await findFloating('option', 'test'));

    expect(onPick).toHaveBeenCalledWith('c');
    await expectClosed();
    expect(field().value).toBe('');
  });

  it('renders the row of the owner', async () => {
    render(SearchSelectFixture, { options, richRows: true });

    await userEvent.click(field());

    await findFloating('option', 'rich test');
  });

  it('opens and closes from the chevron, with the focus in the field', async () => {
    render(SearchSelectFixture, { options });
    const chevron = screen.getByRole('button', { name: 'Show the options' });

    await userEvent.click(chevron);
    expect(field()).toHaveAttribute('aria-expanded', 'true');
    expect(document.activeElement).toBe(field());

    await userEvent.click(chevron);
    await expectClosed();
  });
});
