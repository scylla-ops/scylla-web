import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setAppNavigator } from '@scylla/core-sdk';
import { contextStore } from '@platform/context';
import { goneProject } from '../router/gone-project.state.svelte.ts';
import { breadcrumbParams, linkParams, shareHint } from '../shell-params.ts';

const PROJECT_1 = '00000000-0000-4000-8000-0000000000a1';
const PIPELINE_1 = '00000000-0000-4000-8000-0000000000c1';
const PIPELINE_2 = '00000000-0000-4000-8000-0000000000c2';

const inRoute = (params: Record<string, string>) =>
  setAppNavigator({
    navigate: () => {},
    back: () => {},
    pathname: () => '/',
    search: () => '',
    params: () => params,
    trail: () => [],
  });

beforeEach(() => {
  contextStore.setState({
    workspace: { id: 'org-1', name: 'Acme Corp', slug: null },
    project: { id: PROJECT_1, name: 'Scylla' },
    pipeline: { id: PIPELINE_1, name: 'Nightly' },
  });
});

afterEach(() => setAppNavigator(null));

describe('breadcrumbParams', () => {
  it('names the workspace, the project and the pipeline of the URL', () => {
    inRoute({ pipelineId: PIPELINE_1 });

    expect(breadcrumbParams()).toEqual({
      workspaceName: 'Acme Corp',
      projectName: 'Scylla',
      pipelineName: 'Nightly',
    });
  });

  it('shows the pipeline id when the active pipeline is another one', () => {
    inRoute({ pipelineId: PIPELINE_2 });

    expect(breadcrumbParams().pipelineName).toBe(PIPELINE_2);
  });
});

describe('linkParams', () => {
  it('opens the sidebar links in the active workspace', () => {
    expect(linkParams()).toEqual({ workspaceSlug: 'acme-corp' });
  });

  it('gives no workspace when none is active', () => {
    contextStore.setState({ workspace: { id: null, name: null, slug: null } });

    expect(linkParams()).toEqual({ workspaceSlug: undefined });
  });
});

describe('a project that is gone', () => {
  afterEach(() => goneProject.clear('gone-1'));

  it('hides the project of the URL from the links and the crumbs', () => {
    goneProject.mark('gone-1');
    inRoute({ projectId: 'gone-1' });

    expect(linkParams().projectId).toBe('');
    expect(breadcrumbParams().projectId).toBe('');
  });

  it('leaves another project of the URL alone', () => {
    goneProject.mark('gone-1');
    inRoute({ projectId: PROJECT_1 });

    expect(linkParams().projectId).toBeUndefined();
    expect(breadcrumbParams().projectId).toBeUndefined();
  });
});

describe('an id with a wrong form in the URL', () => {
  it('hides its crumbs, whatever the kind of entity', () => {
    inRoute({ jobId: 'nope', appId: '00000000-0000-4000-8000-0000000000a1' });

    expect(breadcrumbParams().jobId).toBe('');
    expect(breadcrumbParams().appId).toBeUndefined();
    expect(linkParams().jobId).toBe('');
  });
});

describe('shareHint', () => {
  it('tells that only the members of the active workspace with access open a shared link', () => {
    expect(shareHint()).toBe('Only members of Acme Corp with access can open it.');
  });

  it('tells nothing when no workspace is active', () => {
    contextStore.setState({ workspace: { id: null, name: null, slug: null } });

    expect(shareHint()).toBeUndefined();
  });
});
