import { routeParams, type BreadcrumbParams, type RouteParams } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import { contextStore } from '@platform/context';
import { slugifyOrgName } from '@shared/utils/slug.ts';

const context = toRune(contextStore);

/** Reactive. The names that the crumbs show, from the context store. */
export const breadcrumbParams = (): BreadcrumbParams => {
  const { organization, project, pipeline } = context();
  const { pipelineId } = routeParams();
  // The name of the active pipeline only when it is the one in the URL. Else its id.
  const pipelineName = pipeline.id === pipelineId ? pipeline.name : null;

  return {
    organizationName: organization.name || undefined,
    projectName: project.name || undefined,
    pipelineName: pipelineName || pipelineId || undefined,
  };
};

/** Reactive. The sidebar links open in the active organization. */
export const linkParams = (): RouteParams => {
  const { name } = context().organization;
  return { organizationSlug: name ? slugifyOrgName(name) : undefined };
};
