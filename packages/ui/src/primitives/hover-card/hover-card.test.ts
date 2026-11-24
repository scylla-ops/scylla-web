import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { findFloating, render } from '@test/render.ts';
import HoverCardFixture from './hover-card.fixture.svelte';

describe('HoverCard', () => {
  it('keeps the content out of the document until the trigger is hovered', () => {
    render(HoverCardFixture);

    expect(screen.queryByText('See all members')).toBeNull();
  });

  it('shows a content that holds links on hover, which a tooltip must not hold', async () => {
    render(HoverCardFixture);

    await userEvent.hover(screen.getByRole('button', { name: '3 holders' }));

    const link = await findFloating('link', 'See all members');
    expect(link).toHaveAttribute('href', '/acme/access/members');
    expect(screen.getByRole('button', { name: '3 holders' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('shows the content on keyboard focus', async () => {
    render(HoverCardFixture);

    await userEvent.tab();

    await waitFor(() => expect(screen.getByText('See all members')).toBeInTheDocument());
  });
});
