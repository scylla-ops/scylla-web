import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installTestNavigator } from '@test/navigator.ts';
import { contextStore } from '../context.store.ts';
import { workspaceUrl, scyllaHref, scyllaNavigate } from '../scylla-navigate.ts';

let navigator: ReturnType<typeof installTestNavigator>;

beforeEach(() => {
  navigator = installTestNavigator();
  contextStore.setState({ workspace: { id: 'org-1', name: 'Acme Corp', slug: null } });
});

afterEach(() => navigator.restore());

describe('scyllaNavigate', () => {
  it('opens the page of a user in the active workspace', () => {
    scyllaNavigate.goToUser('user-2');

    expect(navigator.navigate).toHaveBeenCalledWith('/admin/users/user-2', undefined);
  });

  it('opens the account of the session in the active workspace', () => {
    scyllaNavigate.goToAccount();

    expect(navigator.navigate).toHaveBeenCalledWith('/acme-corp/account', undefined);
  });
});

describe('workspaceUrl', () => {
  it('gives the dashboard of any workspace by default, from its slug', () => {
    expect(workspaceUrl('beta-lab')).toBe('/beta-lab/dashboard');
  });

  it('gives another page of it on request', () => {
    expect(workspaceUrl('beta-lab', 'account')).toBe('/beta-lab/account');
  });
});

describe('the prefix of the URLs', () => {
  it('uses the slug of the workspace, not its name', () => {
    contextStore.setState({ workspace: { id: 'org-1', name: 'Acme Corp', slug: 'acme' } });
    scyllaNavigate.goToAccount();

    expect(navigator.navigate).toHaveBeenCalledWith('/acme/account', undefined);
  });
});

describe('scyllaHref', () => {
  beforeEach(() => {
    contextStore.setState({ workspace: { id: 'org-1', name: 'Acme Corp', slug: 'acme' } });
  });

  it('gives the pages of a project that the link names, not of the active one', () => {
    contextStore.getState().setProject('project-9', 'web');

    expect(scyllaHref.project('project-1')).toBe('/acme/projects/project-1');
    expect(scyllaHref.jobs('project-1', 'pipeline-1')).toBe(
      '/acme/projects/project-1/pipelines/pipeline-1/jobs',
    );
    expect(scyllaHref.triggers('project-1', 'pipeline-1')).toBe(
      '/acme/projects/project-1/pipelines/pipeline-1/triggers',
    );
  });

  it('opens a job on the logs of one node on request', () => {
    expect(scyllaHref.job('project-1', 'pipeline-1', 'job-1')).toBe(
      '/acme/projects/project-1/pipelines/pipeline-1/jobs/job-1',
    );
    expect(scyllaHref.job('project-1', 'pipeline-1', 'job-1', 'build app')).toBe(
      '/acme/projects/project-1/pipelines/pipeline-1/jobs/job-1?nodes=build%20app',
    );
  });

  it('gives the agents of the workspace', () => {
    expect(scyllaHref.agents()).toBe('/acme/agents');
    expect(scyllaHref.agent('agent-1')).toBe('/acme/agents/agent-1');
  });
});
