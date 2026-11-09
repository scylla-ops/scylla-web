import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { findTooltip, render } from '@test/render.ts';
import type { RoleEntity } from '@base/features/roles/domain/entities/role.entity.ts';
import type { CatalogArea } from '@base/features/roles/domain/structs/catalog.struct.ts';
import RolePermissions from './RolePermissions.svelte';

const area = (id: string, actions: string[]): CatalogArea => ({
  id,
  level: 'project',
  machine: false,
  permissions: actions.map(action => ({
    id: `${id}.${action}`,
    action,
    dependsOn: [],
    implicit: false,
  })),
});

const areas = [
  area('pipelines', ['view', 'edit', 'run']),
  area('triggers', ['manage']),
  area('jobs', ['view', 'edit']),
  area('job_logs', ['view']),
];

const role = (over: Partial<RoleEntity> = {}): RoleEntity => ({
  key: 'r-1',
  name: 'Release manager',
  description: '',
  level: 'project',
  holder: 'people',
  grantName: 'r-1',
  builtin: false,
  fullControl: false,
  permissions: ['pipelines.edit', 'pipelines.run', 'triggers.manage', 'jobs.edit', 'job_logs.view'],
  holderCount: 0,
  ...over,
});

const rect = (width: number) =>
  ({ width, height: 0, x: 0, y: 0, top: 0, left: 0, right: width, bottom: 0 }) as DOMRect;

/** The cell is 250 px wide, a chip 100 px and the "+N" pill 30 px: two chips fit beside the pill. */
beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (this.querySelector(':scope > [data-measure]')) return rect(250);
    if (this.parentElement?.hasAttribute('data-measure')) {
      return rect(this.textContent?.trim().startsWith('+') ? 30 : 100);
    }
    return rect(0);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RolePermissions', () => {
  it('keeps the chips on one line and counts the others in "+N"', () => {
    render(RolePermissions, { role: role(), areas });

    const more = screen.getByRole('button', { name: '+2' });
    const line = within(more.parentElement as HTMLElement);
    expect(line.getByText('Pipelines')).toBeInTheDocument();
    expect(line.getByText('Edit · Run')).toBeInTheDocument();
    expect(line.getByText('Triggers')).toBeInTheDocument();
    expect(line.queryByText('Jobs')).toBeNull();
    expect(line.queryByText('Job logs')).toBeNull();
  });

  it('lists the hidden resources and their actions in the card of "+N"', async () => {
    render(RolePermissions, { role: role(), areas });

    await userEvent.hover(screen.getByRole('button', { name: '+2' }));

    const card = within(await findTooltip());
    expect(card.getByText('2 more permissions')).toBeInTheDocument();
    const [jobs, logs] = card.getAllByRole('listitem', { hidden: true });
    expect(within(jobs).getByText('Jobs')).toBeInTheDocument();
    expect(within(jobs).getByText('Edit')).toBeInTheDocument();
    expect(within(logs).getByText('Job logs')).toBeInTheDocument();
    expect(within(logs).getByText('View')).toBeInTheDocument();
    expect(card.getByText('Open the role to change them.')).toBeInTheDocument();
  });

  it('opens the card from the keyboard too', async () => {
    render(RolePermissions, { role: role({ builtin: true }), areas });

    screen.getByRole('button', { name: '+2' }).focus();

    await waitFor(async () =>
      expect(await findTooltip()).toHaveTextContent('Open the role to see them all.'),
    );
  });

  it('clips the hidden copy of all the chips, so that it does not widen the scroll of the table', () => {
    const { container } = render(RolePermissions, { role: role(), areas });

    expect(container.querySelector('[data-measure]')?.parentElement).toHaveClass('overflow-hidden');
  });

  it('shows no "+N" when every chip fits', () => {
    render(RolePermissions, {
      role: role({ permissions: ['pipelines.edit', 'triggers.manage'] }),
      areas,
    });

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('says full control for a role with every permission of its level', () => {
    render(RolePermissions, { role: role({ fullControl: true }), areas });

    expect(screen.getByText('Full control')).toBeInTheDocument();
    expect(screen.getByText('also delete the project')).toBeInTheDocument();
  });

  it('says view only for a role that only views', () => {
    render(RolePermissions, {
      role: role({ permissions: ['pipelines.view', 'job_logs.view'] }),
      areas,
    });

    expect(screen.getByText('View only')).toBeInTheDocument();
    expect(screen.getByText('pipelines, job logs')).toBeInTheDocument();
  });
});
