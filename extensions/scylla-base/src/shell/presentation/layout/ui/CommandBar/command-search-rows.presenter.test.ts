import { describe, expect, it, vi } from 'vitest';
import { Permission } from '@platform/authz';
import type { CommandRow, CommandRowActions, RowsInput } from './command-row.ts';
import { buildCommandRows, buildRecentRows } from './command-rows.presenter.ts';
import { toRecentRow } from './command-search-rows.presenter.ts';

const NOW = Date.parse('2026-11-26T12:00:00Z');
const JOB_ID = '0190aaaa-0000-7000-8000-00009f3c2a1b';

const actions = (): CommandRowActions => ({
  rerunJob: vi.fn(() => Promise.resolve()),
  setTriggerEnabled: vi.fn(() => Promise.resolve()),
  copyName: vi.fn(() => Promise.resolve()),
});

const input = (overrides: Partial<RowsInput> = {}): RowsInput => ({
  links: [],
  commands: [],
  slug: 'acme',
  workspaceId: 'w1',
  workspaceName: 'Acme',
  project: { id: 'p1', name: 'web-api' },
  can: () => true,
  other: () => undefined,
  projects: [
    { id: 'p1', name: 'web-api' },
    { id: 'p2', name: 'mobile-app' },
  ],
  groups: [],
  pipelines: [{ id: 'l1', name: 'Build web', projectId: 'p1' }],
  fragments: [],
  dashboards: [],
  apps: [],
  members: [],
  workspaceRoles: [],
  instanceRoles: [],
  secrets: [],
  workspaces: [],
  otherWorkspaces: [],
  now: NOW,
  ...overrides,
});

const ofGroup = (rows: readonly CommandRow[], group: CommandRow['group']) =>
  rows.filter(row => row.group === group);

const job = (status: 'failed' | 'completed' = 'failed') => ({
  id: JOB_ID,
  pipelineId: 'l1',
  status,
  createdAt: new Date(NOW - 3 * 60_000).toISOString(),
  source: { branch: 'feature/deploy', tag: '', title: 'Deploy the web app' },
});

const trigger = (patch: { enabled?: boolean; fromFile?: boolean } = {}) => ({
  trigger: {
    id: 't1',
    pipelineId: 'l1',
    name: 'Nightly',
    enabled: patch.enabled ?? true,
    fromFile: patch.fromFile ?? false,
    source: { kind: 'cron' as const },
  },
  projectId: 'p1',
  pipelineName: 'Build web',
  projectName: 'web-api',
});

describe('the rows of the server search', () => {
  it('shows a job with the shape of its status, its number, its pipeline, its branch and its age', () => {
    const [row] = ofGroup(buildCommandRows(input({ jobs: [job()] })), 'jobs');

    expect(row).toMatchObject({
      id: `job:${JOB_ID}`,
      name: '#9f3c2a1b',
      type: 'Job',
      place: 'Build web · web-api',
      facts: 'feature/deploy · 3 min. ago',
      look: { kind: 'status', state: 'failed', label: 'Failed' },
      found: true,
      effect: { kind: 'go', href: `/acme/projects/p1/pipelines/l1/jobs/${JOB_ID}` },
      sentence: 'Go to the job #9f3c2a1b (Build web · web-api).',
    });
  });

  it('names the trigger of a job with no branch, and skips a job of an unknown pipeline', () => {
    const rows = buildCommandRows(
      input({
        jobs: [
          { ...job('completed'), source: undefined, triggerId: 't1' },
          { ...job(), id: 'job-x', pipelineId: 'gone' },
        ],
      }),
    );

    expect(ofGroup(rows, 'jobs').map(row => row.facts)).toEqual(['By a trigger · 3 min. ago']);
  });

  it('offers to rerun a failed job only to a person who can create a job, with a confirmation', async () => {
    const run = actions();
    const allowed = ofGroup(buildCommandRows(input({ jobs: [job()], actions: run })), 'jobs');
    const done = ofGroup(
      buildCommandRows(input({ jobs: [job('completed')], actions: run })),
      'jobs',
    );
    const refused = ofGroup(
      buildCommandRows(
        input({
          jobs: [job()],
          actions: run,
          can: permission => permission !== Permission.CREATE_JOB,
        }),
      ),
      'jobs',
    );

    expect(allowed.map(row => row.name)).toEqual(['#9f3c2a1b', 'Rerun #9f3c2a1b']);
    expect(done).toHaveLength(1);
    expect(refused).toHaveLength(1);
    const rerun = allowed[1];
    expect(rerun.follows).toBe(`job:${JOB_ID}`);
    expect(rerun.effect).toMatchObject({ kind: 'confirm', question: 'Rerun the job #9f3c2a1b?' });
    if (rerun.effect.kind === 'confirm') await rerun.effect.run();
    expect(run.rerunJob).toHaveBeenCalledWith({ jobId: JOB_ID, pipelineId: 'l1', projectId: 'p1' });
  });

  it('shows a trigger with its kind, its pipeline and its state, for a person who manages triggers', () => {
    const rows = buildCommandRows(input({ triggers: [trigger()] }));
    const refused = buildCommandRows(
      input({
        triggers: [trigger()],
        can: permission => permission !== Permission.MANAGE_TRIGGERS,
      }),
    );

    expect(ofGroup(rows, 'triggers')[0]).toMatchObject({
      name: 'Nightly',
      place: 'Build web · web-api',
      facts: 'Enabled',
      iconKey: 'cron',
      effect: { kind: 'go', href: '/acme/projects/p1/pipelines/l1/triggers/t1/edit' },
    });
    expect(ofGroup(refused, 'triggers')).toEqual([]);
  });

  it('disables an enabled trigger with a destructive confirmation, and enables a disabled one', async () => {
    const run = actions();
    const enabled = ofGroup(
      buildCommandRows(input({ triggers: [trigger()], actions: run })),
      'triggers',
    );
    const disabled = ofGroup(
      buildCommandRows(input({ triggers: [trigger({ enabled: false })], actions: run })),
      'triggers',
    );
    const fromFile = ofGroup(
      buildCommandRows(input({ triggers: [trigger({ fromFile: true })], actions: run })),
      'triggers',
    );

    expect(enabled[1]).toMatchObject({
      name: 'Disable Nightly',
      verb: 'Disable…',
      effect: { kind: 'confirm', destructive: true, question: 'Disable the trigger Nightly?' },
    });
    expect(disabled[1]).toMatchObject({ name: 'Enable Nightly', effect: { kind: 'act' } });
    expect(fromFile).toHaveLength(1);
    if (disabled[1].effect.kind === 'act') await disabled[1].effect.run();
    expect(run.setTriggerEnabled).toHaveBeenCalledWith({
      triggerId: 't1',
      pipelineId: 'l1',
      enabled: true,
    });
  });

  it('shows the secrets of each project once, with a lock and the project, and copies a name', async () => {
    const run = actions();
    const rows = ofGroup(
      buildCommandRows(
        input({
          secrets: [{ name: 'DATABASE_URL' }],
          workspaceSecrets: [
            { secret: { id: 's1', name: 'DATABASE_URL', projectId: 'p1' }, projectName: 'web-api' },
            {
              secret: { id: 's9', name: 'STRIPE_KEY', projectId: 'p2' },
              projectName: 'mobile-app',
            },
          ],
          actions: run,
        }),
      ),
      'secrets',
    );

    expect(rows.map(row => `${row.name} (${row.place})`)).toEqual([
      'DATABASE_URL (web-api)',
      'Copy the name DATABASE_URL (web-api)',
      'STRIPE_KEY (mobile-app)',
      'Copy the name STRIPE_KEY (mobile-app)',
    ]);
    expect(rows[2]).toMatchObject({
      facts: 'Project scope',
      found: true,
      effect: { kind: 'go', href: '/acme/projects/p2/secrets' },
    });
    if (rows[3].effect.kind === 'act') await rows[3].effect.run();
    expect(run.copyName).toHaveBeenCalledWith('STRIPE_KEY');
  });

  it('shows a user with its avatar, its email and its state', () => {
    const [row] = ofGroup(
      buildCommandRows(
        input({
          users: [
            {
              id: 'u7',
              username: 'jdoe',
              email: 'jane@acme.test',
              displayName: 'Jane Doe',
              avatarColor: '#aa3322',
              isActive: false,
            },
          ],
        }),
      ),
      'users',
    );

    expect(row).toMatchObject({
      name: 'Jane Doe',
      place: 'jane@acme.test',
      facts: 'Disabled',
      look: { kind: 'person', profile: { avatarColor: '#aa3322', username: 'jdoe' } },
      effect: { kind: 'go', href: '/admin/users/u7' },
    });
  });

  it('shows a package with its publisher, its last version and its stars', () => {
    const [row] = ofGroup(
      buildCommandRows(
        input({
          packages: [
            {
              id: 'scylla/rust-build',
              name: 'rust-build',
              publisher: { handle: 'scylla' },
              versions: [{ number: 1 }, { number: 3 }],
              stars: 12,
            },
          ],
        }),
      ),
      'packages',
    );

    expect(row).toMatchObject({
      name: 'rust-build',
      place: 'scylla',
      facts: 'Version 3 · 12 stars',
      effect: { kind: 'go', href: '/acme/marketplace/scylla/rust-build' },
    });
  });

  it('shows the role of a member and its workspace', () => {
    const [row] = ofGroup(
      buildCommandRows(
        input({
          members: [
            {
              actorId: 'u1',
              actorKind: 'user',
              displayName: 'Marie',
              handle: 'marie',
              avatarColor: '#3366cc',
              roles: [
                { scopeKind: 'project', scopeName: 'web-api', roleName: 'Editor' },
                { scopeKind: 'workspace', scopeName: 'Acme', roleName: 'Member' },
              ],
            },
          ],
        }),
      ),
      'people',
    );

    expect(row).toMatchObject({ place: 'Member', facts: 'Acme' });
    expect(row.look).toMatchObject({ kind: 'person', profile: { avatarColor: '#3366cc' } });
  });

  it('stores a row of the server search for the recent list, and gives it back', () => {
    const [row] = ofGroup(buildCommandRows(input({ jobs: [job()] })), 'jobs');

    const stored = toRecentRow(row);
    const [again] = buildRecentRows(stored ? [stored] : []);

    expect(stored).toEqual({
      id: `job:${JOB_ID}`,
      group: 'jobs',
      name: '#9f3c2a1b',
      place: 'Build web · web-api',
      href: `/acme/projects/p1/pipelines/l1/jobs/${JOB_ID}`,
      look: { kind: 'status', state: 'failed', label: 'Failed' },
    });
    expect(again).toMatchObject({
      id: row.id,
      type: 'Job',
      sentence: row.sentence,
      effect: row.effect,
    });
  });

  it('stores no row of a live list, and no action', () => {
    const rows = buildCommandRows(input({ jobs: [job()], actions: actions() }));

    expect(toRecentRow(rows.find(row => row.id === 'page:x') ?? rows[0])).toBeUndefined();
    expect(toRecentRow(ofGroup(rows, 'jobs')[1])).toBeUndefined();
  });
});
