import { describe, expect, it } from 'vitest';
import { render } from '@test/render.ts';
import type { ActivityLine } from '@base/features/dashboard/presentation/presenters/activity.presenter.ts';
import ActivityRow from './ActivityRow.svelte';

const line = (mark: ActivityLine['mark']): ActivityLine => ({
  id: 'e1',
  mark,
  title: 'Marie',
  job: '',
  detail: 'joined the workspace',
  at: '2026-11-26T10:00:00Z',
});

const avatar = (container: HTMLElement) => container.querySelector('[data-kind]');

describe('ActivityRow', () => {
  it('shows the photo or the initials color of a person, as everywhere else', () => {
    const { container } = render(ActivityRow, {
      line: line({ kind: 'person', initial: 'M' }),
      look: {
        kind: 'person',
        profile: { username: 'marie', displayName: 'Marie', avatarColor: '#3366cc' },
        self: true,
      },
      link: null,
      timeZone: 'UTC',
    });

    expect(avatar(container)).toHaveAttribute('data-kind', 'self');
    expect((avatar(container) as HTMLElement).style.getPropertyValue('--avatar-tile')).toBe(
      '#3366CC',
    );
  });

  it('shows the icon of an agent, with its online dot', () => {
    const { container } = render(ActivityRow, {
      line: line({ kind: 'agent', online: true }),
      look: {
        kind: 'agent',
        profile: { username: '', displayName: 'prod-runner', avatarGlyph: 'cpu' },
        self: false,
      },
      link: null,
      timeZone: 'UTC',
    });

    expect(avatar(container)).toHaveAttribute('data-kind', 'agent');
    expect(container.querySelector('[data-slot="online"]')).toBeInTheDocument();
  });

  it('keeps the initial of an actor that the dashboard does not know', () => {
    const { container } = render(ActivityRow, {
      line: line({ kind: 'person', initial: 'M' }),
      link: null,
      timeZone: 'UTC',
    });

    expect(avatar(container)).not.toBeInTheDocument();
    expect(container).toHaveTextContent(/^M/);
  });
});
