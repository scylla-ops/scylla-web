import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setAppNavigator } from '@scylla/core-sdk';
import { contextStore } from '@platform/context';
import { breadcrumbParams, linkParams } from '../shell-params.ts';

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
    organization: { id: 'org-1', name: 'Acme Corp' },
    project: { id: 'project-1', name: 'Scylla' },
    pipeline: { id: 'pipeline-1', name: 'Nightly' },
  });
});

afterEach(() => setAppNavigator(null));

describe('breadcrumbParams', () => {
  it('names the organization, the project and the pipeline of the URL', () => {
    inRoute({ pipelineId: 'pipeline-1' });

    expect(breadcrumbParams()).toEqual({
      organizationName: 'Acme Corp',
      projectName: 'Scylla',
      pipelineName: 'Nightly',
    });
  });

  it('shows the pipeline id when the active pipeline is another one', () => {
    inRoute({ pipelineId: 'pipeline-2' });

    expect(breadcrumbParams().pipelineName).toBe('pipeline-2');
  });
});

describe('linkParams', () => {
  it('opens the sidebar links in the active organization', () => {
    expect(linkParams()).toEqual({ organizationSlug: 'acme-corp' });
  });

  it('gives no organization when none is active', () => {
    contextStore.setState({ organization: { id: null, name: null } });

    expect(linkParams()).toEqual({ organizationSlug: undefined });
  });
});
