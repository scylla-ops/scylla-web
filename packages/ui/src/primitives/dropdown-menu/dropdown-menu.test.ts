import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { findFloating, render } from '@test/render.ts';
import DropdownMenuFixture from './dropdown-menu.fixture.svelte';

const openMenu = async () => {
  const user = userEvent.setup();
  render(DropdownMenuFixture);
  await user.click(screen.getByRole('button', { name: 'Account' }));
  return user;
};

describe('DropdownMenu', () => {
  it('opens a submenu when the pointer is on its item', async () => {
    const user = await openMenu();

    await user.hover(await findFloating('menuitem', 'Documents'));

    expect(await findFloating('menuitem', 'Privacy policy')).toBeInTheDocument();
  });

  // The menu is a `relative` scroller: it clips all that goes out of it, and a submenu is beside it.
  it('puts a submenu outside its menu', async () => {
    const user = await openMenu();

    await user.hover(await findFloating('menuitem', 'Documents'));

    const item = await findFloating('menuitem', 'Privacy policy');
    expect(item.closest('[data-slot="dropdown-menu-sub-content"]')).not.toBeNull();
    expect(item.closest('[data-slot="dropdown-menu-content"]')).toBeNull();
  });
});
