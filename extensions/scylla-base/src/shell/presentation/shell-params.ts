import { routeParams, type BreadcrumbParams, type RouteParams } from '@scylla/core-sdk';
import { t } from '@scylla/ui/i18n';
import { toRune } from '@scylla/ui/stores';
import { contextStore } from '@platform/context';
import { malformedIdParams } from '@shared/utils/id.ts';
import { slugifyWorkspaceName } from '@shared/utils/slug.ts';
import { layoutMessages } from './layout/messages/layout.messages.ts';
import { goneProject } from './router/gone-project.state.svelte.ts';

const context = toRune(contextStore);

/** Reactive. The names that the crumbs show, from the context store. */
/**
 * '' for the project of the URL when it is gone: it hides its sidebar and its crumbs. Gone, like
 * the slug case, is the Projects page with the not-found page in it.
 */
const goneParams = (): RouteParams => {
  const params = routeParams();
  const gone: Record<string, string> = {};
  // An id with a wrong form is the id of nothing, like a project that is gone.
  for (const name of malformedIdParams(params)) gone[name] = '';
  if (goneProject.id !== null && goneProject.id === params.projectId) gone.projectId = '';
  return gone;
};

export const breadcrumbParams = (): BreadcrumbParams => {
  const { workspace, project, pipeline } = context();
  const { pipelineId } = routeParams();
  // The name of the active pipeline only when it is the one in the URL. Else its id.
  const pipelineName = pipeline.id === pipelineId ? pipeline.name : null;

  return {
    workspaceName: workspace.name || undefined,
    projectName: project.name || undefined,
    pipelineName: pipelineName || pipelineId || undefined,
    ...goneParams(),
  };
};

/** Reactive. The sidebar links open in the active workspace. */
export const linkParams = (): RouteParams => {
  // A context saved before the slugs has the name only.
  const { slug, name } = context().workspace;
  return {
    workspaceSlug: slug || (name ? slugifyWorkspaceName(name) : undefined),
    ...goneParams(),
  };
};

/** Reactive. Who can open a link that the share button of the top bar gives. */
export const shareHint = (): string | undefined => {
  const { name } = context().workspace;
  return name ? t(layoutMessages.shareHint(name)) : undefined;
};
