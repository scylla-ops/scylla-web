import { point } from '@scylla/core-sdk';
import type { ProjectDensity } from './presenters/project-density.presenter.ts';

/** The project that a part of its card shows. */
export interface ProjectCardContext {
  workspaceId: string;
  projectId: string;
  projectName: string;
  /**
   * The projects of the cards that came with this one ("Show more" adds a batch). A part reads
   * the data of the whole batch in one call, not one call for each card.
   */
  batch: readonly string[];
  /**
   * The shape that shows the project: `comfortable` (the card with each zone), `compact` (a
   * smaller card: no body), `list` (one row: the footer is at its end) or `tiles` (a small tile:
   * the badge and the footer under the name). A zone fits its text to it.
   */
  density: ProjectDensity;
}

/**
 * Listed in `ProjectModule.points`: the loader names them `project.<key>`. The pipelines and the
 * repository of a project are in `features/pipeline` and `features/integrations`, which import
 * this module: these zones let them show on the card of the project with no import back.
 */
export const projectPoints = {
  /** After the name of the project: a short fact, such as the count of failing pipelines. */
  cardBadge: point.zone<ProjectCardContext>(),
  /** Under the name of the project: one line, such as the linked repository. */
  cardSubtitle: point.zone<ProjectCardContext>(),
  /** Under the description: the pipelines of the project. */
  cardBody: point.zone<ProjectCardContext>(),
  /** At the bottom of the card: one line, such as the time of the last job. */
  cardFooter: point.zone<ProjectCardContext>(),
};
