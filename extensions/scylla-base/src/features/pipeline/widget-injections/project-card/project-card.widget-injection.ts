import { projectPoints } from '@base/features/project';

/**
 * The pipelines of a project on its card of the projects page: the count of failing pipelines
 * after its name, one row for each of its first pipelines, and its last job at the bottom. The
 * project opens the zones: this module reads the projects, so the project cannot import it.
 * Scoped by the backend: the cards read no pipeline of a project that the reader cannot see.
 */
export const ProjectCardPipelinesWidgetInjection = [
  projectPoints.cardBadge.inject({
    component: () =>
      import('@base/features/pipeline/presentation/ui/ProjectCardPipelines/ProjectCardBadge.svelte'),
  }),
  projectPoints.cardBody.inject({
    component: () =>
      import('@base/features/pipeline/presentation/ui/ProjectCardPipelines/ProjectCardPipelines.svelte'),
  }),
  projectPoints.cardFooter.inject({
    component: () =>
      import('@base/features/pipeline/presentation/ui/ProjectCardPipelines/ProjectCardFooter.svelte'),
  }),
  projectPoints.cardPrefetch.inject({
    component: () =>
      import('@base/features/pipeline/presentation/ui/ProjectCardPipelines/ProjectCardPrefetch.svelte'),
  }),
];
