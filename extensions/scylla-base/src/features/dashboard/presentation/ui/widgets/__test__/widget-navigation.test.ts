import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import type { PipelineSummary } from '@base/features/pipeline';
import type { ActivityEvent } from '@base/features/dashboard/domain/structs/activity.struct.ts';
import type { AttentionItem } from '@base/features/dashboard/domain/structs/attention.struct.ts';
import {
  activityLink,
  agentLink,
  agentsLink,
  attentionLink,
  enterPlace,
  integrationsLink,
  jobLink,
  jobMarkLink,
  pipelineJobsLink,
  projectLink,
  triggersLink,
} from '../widget-navigation.ts';

const JOB = {
  jobId: 'job-1',
  pipelineId: 'pipeline-1',
  pipelineName: 'build-api',
  projectId: 'project-1',
  projectName: 'backend',
};

const PIPELINE = {
  id: 'pipeline-1',
  name: 'build-api',
  projectId: 'project-1',
  projectName: 'backend',
};

const PLACE = {
  projectId: 'project-1',
  projectName: 'backend',
  pipelineId: 'pipeline-1',
  pipelineName: 'build-api',
};

const summary = (overrides: Partial<PipelineSummary> = {}): PipelineSummary => ({
  ...PIPELINE,
  recent: [],
  completed: 0,
  failed: 0,
  medianDuration: null,
  health: 'none',
  active: false,
  triggerKinds: [],
  nextFire: null,
  ...overrides,
});

const PIPELINES: ReadonlyMap<string, PipelineSummary> = new Map([
  ['pipeline-1', summary()],
  ['pipeline-2', summary({ id: 'pipeline-2', projectId: 'project-2', projectName: 'frontend' })],
]);

const event = (overrides: Partial<ActivityEvent> = {}): ActivityEvent => ({
  id: 'event-1',
  kind: 'job.ended',
  area: 'jobs',
  actorName: 'Ada',
  projectId: 'project-1',
  projectName: 'backend',
  subjectKind: 'job',
  subjectId: 'job-1',
  params: { pipeline: 'build-api' },
  at: '2026-11-17T09:00:00Z',
  ...overrides,
});

const item = (overrides: Partial<AttentionItem> = {}): AttentionItem => ({
  kind: 'job-failed',
  at: '2026-11-17T09:00:00Z',
  isNew: false,
  count: 1,
  projectId: 'project-1',
  projectName: 'backend',
  pipelineId: 'pipeline-1',
  pipelineName: 'build-api',
  ...overrides,
});

const grant = (permissions: Permission[]) =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.WORKSPACE,
          scopeId: 'ws-1',
          access: { kind: 'restricted', permissions },
        },
      ],
    },
  });

const click = (init: MouseEventInit = {}) =>
  new MouseEvent('click', { button: 0, cancelable: true, ...init });

beforeEach(() => {
  contextStore.setState({
    workspace: { id: 'ws-1', name: 'Acme', slug: 'acme' },
    project: { id: null, name: null },
    pipeline: { id: null, name: null },
  });
  grant([Permission.MANAGE_TRIGGERS]);
});

afterEach(() => {
  permissionsStore.setState({ permissions: null });
});

describe('the links of the widgets', () => {
  it('opens a job, and the logs of a node of the job', () => {
    expect(jobLink(JOB)).toEqual({
      href: '/acme/projects/project-1/pipelines/pipeline-1/jobs/job-1',
      place: PLACE,
    });
    expect(jobLink(JOB, 'build app')?.href).toBe(
      '/acme/projects/project-1/pipelines/pipeline-1/jobs/job-1?nodes=build%20app',
    );
  });

  it('gives no link to a job of an unknown project', () => {
    expect(jobLink({ ...JOB, projectId: '' })).toBeNull();
    expect(jobMarkLink({ ...JOB, projectId: '' })).toEqual({});
  });

  it('makes a mark a link to its job', () => {
    const mark = jobMarkLink(JOB);

    expect(mark.href).toBe('/acme/projects/project-1/pipelines/pipeline-1/jobs/job-1');
    expect(mark.onSelect).toBeTypeOf('function');
  });

  it('opens the jobs of a known pipeline only', () => {
    expect(pipelineJobsLink(PIPELINE)).toEqual({
      href: '/acme/projects/project-1/pipelines/pipeline-1/jobs',
      place: PLACE,
    });
    expect(pipelineJobsLink(undefined)).toBeNull();
  });

  it('opens the triggers only for a person who can manage them', () => {
    const trigger = {
      pipelineId: 'pipeline-1',
      pipelineName: 'build-api',
      projectId: 'project-1',
      projectName: 'backend',
    };

    expect(triggersLink(trigger)).toEqual({
      href: '/acme/projects/project-1/pipelines/pipeline-1/triggers',
      place: PLACE,
    });

    grant([Permission.READ_USER]);
    expect(triggersLink(trigger)).toBeNull();
  });

  it('opens an agent, the agents, a project and the integrations of the workspace', () => {
    expect(agentLink('agent-1')).toEqual({ href: '/acme/agents/agent-1' });
    expect(agentsLink()).toEqual({ href: '/acme/agents' });
    expect(projectLink('project-2', 'frontend')).toEqual({
      href: '/acme/projects/project-2',
      place: { projectId: 'project-2', projectName: 'frontend' },
    });
    expect(integrationsLink()).toEqual({ href: '/acme/settings/integrations' });
  });

  it('opens the subject of an item of Needs you', () => {
    const job = { id: 'job-1', error: '', branch: '', agentName: '', nodeId: '', nodeError: '' };
    const fire = {
      id: 'fire-1',
      triggerId: 't-1',
      triggerName: 'nightly',
      schedule: '',
      error: '',
    };
    const agent = { id: 'agent-1', name: 'runner', lastSeenAt: '' };

    expect(attentionLink(item({ job }))?.href).toBe(
      '/acme/projects/project-1/pipelines/pipeline-1/jobs/job-1',
    );
    expect(attentionLink(item({ kind: 'fire-failed', fire }))?.href).toBe(
      '/acme/projects/project-1/pipelines/pipeline-1/triggers',
    );
    expect(
      attentionLink(item({ kind: 'agent-offline', agent, projectId: '', pipelineId: '' }))?.href,
    ).toBe('/acme/agents/agent-1');
    expect(attentionLink(item())).toBeNull();
  });
});

describe('activityLink', () => {
  it('opens the job of a job event, in the pipeline of its name and project', () => {
    expect(activityLink(event(), PIPELINES)).toEqual({
      href: '/acme/projects/project-1/pipelines/pipeline-1/jobs/job-1',
      place: PLACE,
      title: 'Open the job',
    });
  });

  it('opens the triggers of the pipeline of a trigger event', () => {
    const link = activityLink(
      event({ kind: 'trigger.fired', subjectKind: 'trigger', subjectId: 't-1' }),
      PIPELINES,
    );

    expect(link).toMatchObject({
      href: '/acme/projects/project-1/pipelines/pipeline-1/triggers',
      title: 'Open the triggers of this pipeline',
    });
  });

  it('opens the agent of an agent event, and the integrations for a connection event', () => {
    expect(
      activityLink(
        event({ kind: 'agent.registered', subjectId: 'agent-1', projectId: '' }),
        PIPELINES,
      ),
    ).toEqual({
      href: '/acme/agents/agent-1',
      title: 'Open the agent',
    });
    expect(
      activityLink(event({ kind: 'connection.added', subjectId: 'c-1', projectId: '' }), PIPELINES),
    ).toEqual({
      href: '/acme/settings/integrations',
      title: 'Open the integrations',
    });
  });

  it('gives no link when the event has no page, or names no single known pipeline', () => {
    expect(activityLink(event({ kind: 'secret.created' }), PIPELINES)).toBeNull();
    expect(activityLink(event({ params: { pipeline: 'gone' } }), PIPELINES)).toBeNull();
    expect(activityLink(event({ projectId: 'project-3' }), PIPELINES)).toBeNull();

    const twins = new Map([...PIPELINES, ['pipeline-3', summary({ id: 'pipeline-3' })]]);
    expect(activityLink(event(), twins)).toBeNull();
  });
});

describe('enterPlace', () => {
  it('names the project and the pipeline of the page before the router opens it', () => {
    enterPlace(PLACE)(click());

    expect(contextStore.getState().project).toEqual({ id: 'project-1', name: 'backend' });
    expect(contextStore.getState().pipeline).toEqual({ id: 'pipeline-1', name: 'build-api' });
  });

  it('keeps the context for a click that opens another tab', () => {
    enterPlace(PLACE)(click({ ctrlKey: true }));
    enterPlace(PLACE)(click({ button: 1 }));

    expect(contextStore.getState().project).toEqual({ id: null, name: null });
  });
});
