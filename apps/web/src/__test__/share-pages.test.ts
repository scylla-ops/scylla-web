import { describe, it, expect } from 'vitest';
import { compileRoutes, loadExtensions } from '@scylla/core';
import { extensions } from '../extensions.ts';

/**
 * The pages with the share button of the top bar, as the app compiles them from every extension:
 * a page that a member opens again from a link. A form, a list that the sidebar opens, a page of
 * settings or of management, a personal page, the administration of the server and a public page
 * have no button.
 */

const SHARED_PAGES = [
  '/:workspaceSlug/dashboard',
  '/:workspaceSlug/dashboards/:dashboardId',
  '/:workspaceSlug/library/:fragmentId',
  '/:workspaceSlug/agents/:appId',
  '/:workspaceSlug/apps/:appId',
  '/:workspaceSlug/marketplace/:packageId',
  '/:workspaceSlug/projects/:projectId',
  '/:workspaceSlug/projects/:projectId/edit/:pipelineId',
  '/:workspaceSlug/projects/:projectId/pipelines/:pipelineId',
  '/:workspaceSlug/projects/:projectId/pipelines/:pipelineId/jobs',
  '/:workspaceSlug/projects/:projectId/pipelines/:pipelineId/jobs/:jobId',
];

const routes = compileRoutes(loadExtensions(extensions).router).routes;
const shared = routes.flatMap(route => (route.share ? [`/${route.path.join('/')}`] : []));

describe('the share button of the top bar', () => {
  it('is on the pages that a member opens again from a link, and on no other page', () => {
    expect([...shared].sort()).toEqual([...SHARED_PAGES].sort());
  });

  it('is never on a page outside the shell', () => {
    expect(routes.filter(route => route.share && !route.shell)).toEqual([]);
  });
});
