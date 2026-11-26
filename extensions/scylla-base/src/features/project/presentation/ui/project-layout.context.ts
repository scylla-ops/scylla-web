import { getContext, setContext } from 'svelte';
import type { ProjectGroupEntity } from '@base/features/project/domain/entities/project-group.entity.ts';
import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
import type { SectionKey } from '../presenters/project-sections.presenter.ts';

/** What the menu of a card needs from the projects page: the pins, the groups and the order. */
export interface ProjectLayout {
  readonly groups: readonly ProjectGroupEntity[];
  /** « Move up » and « Move down » show: the custom order, with no search. */
  readonly canArrange: boolean;
  isPinned: (projectId: string) => boolean;
  togglePin: (projectId: string) => void;
  /** The cards before and after a card of a section, in the order of the page. */
  neighbors: (section: SectionKey, projectId: string) => { previous?: string; next?: string };
  moveUp: (section: SectionKey, project: ProjectEntity) => void;
  moveDown: (section: SectionKey, project: ProjectEntity) => void;
}

const KEY = Symbol('project-layout');

export const setProjectLayout = (layout: ProjectLayout): ProjectLayout => setContext(KEY, layout);

/** Unset out of the projects page: the menu of a card then has no pin, no group and no order. */
export const getProjectLayout = (): ProjectLayout | undefined => getContext(KEY);
