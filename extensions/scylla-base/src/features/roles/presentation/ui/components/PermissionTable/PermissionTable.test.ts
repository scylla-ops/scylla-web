import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { findTooltip, render } from '@test/render.ts';
import type { CatalogArea } from '../../../../domain/structs/catalog.struct.ts';
import PermissionTableFixture from './PermissionTable.fixture.svelte';
import PermissionTable from './PermissionTable.svelte';

const areas: CatalogArea[] = [
  {
    id: 'users',
    level: 'platform',
    machine: false,
    permissions: [{ id: 'users.view', action: 'view', dependsOn: [], implicit: false }],
  },
  {
    id: 'workspace',
    level: 'workspace',
    machine: false,
    permissions: [
      { id: 'workspace.view', action: 'view', dependsOn: [], implicit: true },
      { id: 'workspace.edit', action: 'edit', dependsOn: ['workspace.view'], implicit: false },
      { id: 'workspace.delete', action: 'delete', dependsOn: ['workspace.view'], implicit: false },
    ],
  },
  {
    id: 'members',
    level: 'workspace',
    machine: false,
    permissions: [
      { id: 'members.view', action: 'view', dependsOn: [], implicit: false },
      { id: 'members.manage', action: 'manage', dependsOn: ['members.view'], implicit: false },
    ],
  },
  {
    id: 'audit',
    level: 'workspace',
    machine: false,
    permissions: [{ id: 'audit.view', action: 'view', dependsOn: [], implicit: true }],
  },
  {
    id: 'pipelines',
    level: 'project',
    machine: false,
    permissions: [
      { id: 'pipelines.view', action: 'view', dependsOn: [], implicit: false },
      { id: 'pipelines.edit', action: 'edit', dependsOn: ['pipelines.view'], implicit: false },
      { id: 'pipelines.run', action: 'run', dependsOn: ['pipelines.view'], implicit: false },
    ],
  },
];

const ALWAYS_ON = ['audit.view', 'workspace.view'];

const open = (props: {
  initial?: string[];
  held?: Set<string>;
  level?: 'platform' | 'workspace';
}) => {
  const onChange = vi.fn<(selected: Set<string>) => void>();
  render(PermissionTableFixture, {
    areas,
    level: props.level ?? 'workspace',
    initial: props.initial ?? ALWAYS_ON,
    held: props.held,
    onChange,
  });
  const last = () => [...(onChange.mock.calls.at(-1)?.[0] ?? [])].sort();
  return { onChange, last };
};

const tabBox = () => screen.getByRole('checkbox', { name: 'All on this tab' });
const rowBox = (area: string) => screen.queryByRole('checkbox', { name: `${area} · All actions` });

describe('PermissionTable: the levels', () => {
  it('has a tab for each level of the role and no Instance tab for a workspace role', () => {
    open({});

    expect(screen.getAllByRole('tab').map(tab => tab.textContent?.trim())).toEqual([
      'Workspace 2 / 6',
      'Project 0 / 3',
    ]);
    expect(screen.queryByRole('tab', { name: /Instance/ })).toBeNull();
    expect(screen.queryByText('Users')).toBeNull();
  });

  it('has an Instance tab for an instance role', () => {
    open({ level: 'platform', initial: [] });

    expect(screen.getByRole('tab', { name: /Instance/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows only the areas of the active tab, with where they apply', async () => {
    open({});

    expect(screen.getByText('Members')).toBeInTheDocument();
    expect(screen.queryByText('Pipelines')).toBeNull();
    expect(screen.getByText(/The Project tab covers every project/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: /Project/ }));

    expect(screen.getByText('Pipelines')).toBeInTheDocument();
    expect(screen.queryByText('Members')).toBeNull();
    expect(
      screen.getByText('In every project of the workspace where the role is granted.'),
    ).toBeInTheDocument();
  });
});

describe('PermissionTable: select all and clear all', () => {
  it('selects every cell of the tab, then clears them, and keeps the cells that are always on', async () => {
    const { last } = open({});
    expect(tabBox()).toHaveAttribute('aria-checked', 'false');

    await userEvent.click(tabBox());

    expect(last()).toEqual([
      'audit.view',
      'members.manage',
      'members.view',
      'workspace.delete',
      'workspace.edit',
      'workspace.view',
    ]);
    expect(tabBox()).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(tabBox());

    expect(last()).toEqual(ALWAYS_ON);
    expect(tabBox()).toHaveAttribute('aria-checked', 'false');
  });

  it('is mixed while only a part is selected, and a click then selects the rest', async () => {
    const { last } = open({ initial: [...ALWAYS_ON, 'members.view'] });

    expect(tabBox()).toHaveAttribute('aria-checked', 'mixed');
    expect(rowBox('Members')).toHaveAttribute('aria-checked', 'mixed');
    expect(rowBox('Workspace')).toHaveAttribute('aria-checked', 'false');

    await userEvent.click(rowBox('Members') as HTMLElement);

    expect(last()).toEqual([...ALWAYS_ON, 'members.manage', 'members.view'].sort());
    expect(rowBox('Members')).toHaveAttribute('aria-checked', 'true');
  });

  it('gives no checkbox to a row with no cell to change', () => {
    open({});

    expect(screen.getByText('audit')).toBeInTheDocument();
    expect(rowBox('audit')).toBeNull();
  });

  it('tells on a cell what a click on it also checks', () => {
    open({});

    expect(screen.getByRole('checkbox', { name: 'Members · Manage' })).toHaveAttribute(
      'title',
      'Needs Members · View',
    );
    expect(screen.getByRole('checkbox', { name: 'Members · View' })).not.toHaveAttribute('title');
  });

  it('leaves out a cell that the caller does not hold', async () => {
    const { last } = open({
      held: new Set(['workspace.edit', 'workspace.delete', 'members.view']),
    });

    await userEvent.click(tabBox());

    expect(last()).not.toContain('members.manage');
    expect(tabBox()).toHaveAttribute('aria-checked', 'true');
  });

  it('says what a click on the box of the tab does', async () => {
    open({});

    await userEvent.hover(tabBox());

    expect(await findTooltip()).toHaveTextContent('Select all 4 on this tab');
  });
});

describe('PermissionTable: a column', () => {
  it('selects a column with the View it needs, as a click on each cell does', async () => {
    const { last } = open({});
    await userEvent.click(screen.getByRole('tab', { name: /Project/ }));

    await userEvent.click(screen.getByRole('button', { name: 'Select the whole Edit column' }));

    expect(last()).toEqual([...ALWAYS_ON, 'pipelines.edit', 'pipelines.view'].sort());
    expect(rowBox('Pipelines')).toHaveAttribute('aria-checked', 'mixed');
    expect(screen.getByRole('button', { name: 'Clear the whole Edit column' })).toBeInTheDocument();
  });

  it('clears a column with the cells that need it', async () => {
    const { last } = open({ initial: [...ALWAYS_ON, 'pipelines.view', 'pipelines.run'] });
    await userEvent.click(screen.getByRole('tab', { name: /Project/ }));

    await userEvent.click(screen.getByRole('button', { name: 'Clear the whole View column' }));

    expect(last()).toEqual(ALWAYS_ON);
  });

  it('says what a click on the header does', async () => {
    open({});

    await userEvent.hover(screen.getByRole('button', { name: 'Select the whole Manage column' }));

    expect(await findTooltip()).toHaveTextContent('Select the whole Manage column');
  });

  it('has no button for a column with no cell to change', () => {
    open({});

    expect(screen.getByRole('columnheader', { name: 'Run' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Run column/ })).toBeNull();
  });
});

describe('PermissionTable: a role of the instance', () => {
  const catalog: CatalogArea[] = [
    {
      id: 'workspaces',
      level: 'platform',
      machine: false,
      permissions: [
        { id: 'workspaces.view', action: 'view', dependsOn: ['workspace.view'], implicit: false },
      ],
    },
    ...areas,
  ];

  it('checks the view of each workspace with a permission of a workspace, and tells it', async () => {
    const onChange = vi.fn<(selected: Set<string>) => void>();
    render(PermissionTableFixture, { areas: catalog, level: 'platform', initial: [], onChange });
    await userEvent.click(screen.getByRole('tab', { name: /Workspace/ }));
    const cell = screen.getByRole('checkbox', { name: 'Members · View' });

    expect(cell).toHaveAttribute('title', 'Needs Workspaces · View');
    await userEvent.click(cell);
    expect([...(onChange.mock.calls.at(-1)?.[0] ?? [])].sort()).toEqual([
      'members.view',
      'workspace.view',
      'workspaces.view',
    ]);
  });
});

describe('PermissionTable: read only', () => {
  it('shows the tabs with no checkbox and no button', () => {
    render(PermissionTable, {
      areas,
      level: 'workspace',
      holder: 'people',
      selected: new Set(['workspace.view', 'members.view']),
    });

    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /column/ })).toBeNull();
  });
});
