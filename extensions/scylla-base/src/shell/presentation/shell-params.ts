import { routeParams, type BreadcrumbParams, type RouteParams } from '@scylla/core-sdk';
import { t } from '@scylla/ui/i18n';
import { toRune } from '@scylla/ui/stores';
import { contextStore } from '@platform/context';
import { slugifyWorkspaceName } from '@shared/utils/slug.ts';
import { layoutMessages } from './layout/messages/layout.messages.ts';

const context = toRune(contextStore);

/** Reactive. The names that the crumbs show, from the context store. */
export const breadcrumbParams = (): BreadcrumbParams => {
  const { workspace, project, pipeline } = context();
  const { pipelineId } = routeParams();
  // The name of the active pipeline only when it is the one in the URL. Else its id.
  const pipelineName = pipeline.id === pipelineId ? pipeline.name : null;

  return {
    workspaceName: workspace.name || undefined,
    projectName: project.name || undefined,
    pipelineName: pipelineName || pipelineId || undefined,
  };
};

/** Reactive. The sidebar links open in the active workspace. */
export const linkParams = (): RouteParams => {
  // A context saved before the slugs has the name only.
  const { slug, name } = context().workspace;
  return { workspaceSlug: slug || (name ? slugifyWorkspaceName(name) : undefined) };
};

/** Reactive. Who can open a link that the share button of the top bar gives. */
export const shareHint = (): string | undefined => {
  const { name } = context().workspace;
  return name ? t(layoutMessages.shareHint(name)) : undefined;
};
