import { describe, expect, it } from 'vitest';
import type { CatalogArea } from '../../../domain/structs/catalog.struct.ts';
import { permissionLabel as fullName } from '../../messages/roles.messages.ts';
import {
  cellTitle,
  permissionLabel,
  permissionRows,
  tableActions,
  type PermissionCell,
} from '../permission-table.presenter.ts';

const area = (
  id: string,
  level: CatalogArea['level'],
  actions: string[],
  dependsOn: Record<string, string[]> = {},
): CatalogArea => ({
  id,
  level,
  machine: false,
  permissions: actions.map(action => ({
    id: `${id}.${action}`,
    action,
    dependsOn: dependsOn[action] ?? [],
    implicit: false,
  })),
});

const gitProviders = area('git_providers', 'platform', ['manage']);
const members = area('members', 'workspace', ['view', 'manage']);
const integrations = area('integrations', 'workspace', ['view', 'manage']);
const pipelines = area('pipelines', 'project', ['view', 'run']);
const repository = area('repository', 'project', ['view', 'edit']);
const jobs = area('jobs', 'project', ['view', 'edit', 'delete', 'approve'], {
  approve: ['jobs.view'],
});
const catalog = [gitProviders, members, integrations, pipelines, repository, jobs];

const SIX = ['view', 'create', 'edit', 'delete', 'run', 'manage'];

/** `held`: what the caller holds. Absent: nothing locks. */
const approveCell = (held?: Set<string>) =>
  permissionRows([jobs], catalog, 'project', new Set(), held)[0]?.cells.find(
    cell => cell.action === 'approve',
  ) as Extract<PermissionCell, { id: string }>;

describe('tableActions', () => {
  it('keeps the six columns when no area of the tab has another action', () => {
    expect(tableActions([members, integrations])).toEqual(SIX);
  });

  it('adds the Approve column before Manage when an area of the tab can approve', () => {
    expect(tableActions([pipelines, repository, jobs])).toEqual([
      'view',
      'create',
      'edit',
      'delete',
      'run',
      'approve',
      'manage',
    ]);
  });

  it('puts an action that it does not know after the others', () => {
    expect(tableActions([area('reports', 'project', ['export', 'view'])])).toEqual([
      ...SIX,
      'export',
    ]);
  });
});

describe('permissionRows', () => {
  it('gives the jobs an approve cell that a click can change, and the other rows an empty cell', () => {
    const [pipelineRow, jobRow] = permissionRows([pipelines, jobs], catalog, 'project', new Set());

    expect(jobRow?.cells.map(cell => cell.action)).toEqual(tableActions([pipelines, jobs]));
    expect(jobRow?.cells.find(cell => cell.action === 'approve')).toMatchObject({
      kind: 'open',
      id: 'jobs.approve',
      needs: ['jobs.view'],
    });
    expect(jobRow?.open).toContain('jobs.approve');
    expect(pipelineRow?.cells.find(cell => cell.action === 'approve')).toEqual({
      action: 'approve',
      kind: 'none',
    });
  });
});

describe('the names of the permissions of the Git integration', () => {
  it('names the new areas, not their ids', () => {
    expect(permissionLabel('integrations.manage', catalog)).toBe('Integrations · Manage');
    expect(permissionLabel('repository.edit', catalog)).toBe('Repository · Edit');
    expect(fullName('integrations.view', catalog)).toBe('View integrations');
    expect(fullName('repository.edit', catalog)).toBe('Edit repository');
  });

  it('gives its full name to the approval of a fork run and to the Git providers', () => {
    expect(permissionLabel('jobs.approve', catalog)).toBe('Approve fork runs');
    expect(permissionLabel('git_providers.manage', catalog)).toBe('Manage Git providers');
    expect(fullName('jobs.approve', catalog)).toBe('Approve fork runs');
    expect(fullName('git_providers.manage', catalog)).toBe('Manage Git providers');
  });

  it('tells on hover what the approval does, then what a click also checks', () => {
    expect(cellTitle(approveCell(), catalog)).toBe(
      'Approve or reject a run of a pull request from a fork. Such a run never gets the secrets.\nNeeds Jobs · View',
    );
  });

  it('tells what the approval does also when the caller cannot give it', () => {
    const cell = approveCell(new Set());

    expect(cell.kind).toBe('locked');
    expect(cellTitle(cell, catalog)).toBe(
      'Approve or reject a run of a pull request from a fork. Such a run never gets the secrets.\nYou do not have it, or not at this level',
    );
  });
});
