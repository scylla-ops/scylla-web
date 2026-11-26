import { projectPoints } from '@base/features/project';

/**
 * The linked repository of a project, under its name on its card of the projects page. The
 * project opens the zone: this module reads the projects, so the project cannot import it.
 */
export const ProjectCardRepositoryWidgetInjection = [
  projectPoints.cardSubtitle.inject({
    component: () =>
      import('@base/features/integrations/presentation/ui/ProjectRepositoryLine/ProjectRepositoryLine.svelte'),
  }),
];
