import type { ProjectEntity } from '../entities/project.entity.ts';

/**
 * The order of a list of projects. `position` is the order of the workspace: before a member
 * sets one, the oldest project comes first. `last-job`: the newest job first. `failed-first`:
 * the failing projects, then the running projects, then the pending projects, then the others;
 * by name in each group.
 */
export type ProjectOrder = 'position' | 'name' | 'last-job' | 'failed-first';

/**
 * A filter by health. `failed`: a pipeline of the project has a last ended job that did not
 * complete. `running`: a job of the project runs. `pending`: a job of the project waits for an
 * agent or for an approval.
 */
export type ProjectHealth = 'all' | 'failed' | 'running' | 'pending';

/** A section of the projects page: the projects of one group, or the projects with no group. */
export type ProjectSection = { kind: 'group'; groupId: string } | { kind: 'ungrouped' };

/** The counts of the projects that a search keeps, on all the pages. */
export interface ProjectCounts {
  total: number;
  failed: number;
  /** The projects with a job that runs. */
  running: number;
  /** The projects with a job that waits for an agent or for an approval. */
  pending: number;
  /** The pipelines of these projects. */
  pipelines: number;
}

/** A search in the projects of a workspace. */
export interface ProjectSearch {
  workspaceId: string;
  /** In the name, the description, the linked repository or a pipeline name. Empty: each project. */
  query: string;
  order: ProjectOrder;
  health: ProjectHealth;
  /** Only the projects of this section. Unset: each project. */
  section?: ProjectSection;
  /** Only these projects, at most 100. Unset or empty: each project. */
  projectIds?: readonly string[];
  /** The number of projects to read, from the first. */
  limit: number;
}

/** The first projects of a search, and the counts of all of them. */
export interface ProjectSearchResult {
  items: ProjectEntity[];
  /** The health of the search does not change them: each segment of the filter shows its count. */
  counts: ProjectCounts;
  /** More projects come after the items. */
  hasMore: boolean;
}

/** The number of projects that a search with this health gives, on all the pages. */
export const countOfHealth = (counts: ProjectCounts, health: ProjectHealth): number =>
  health === 'all' ? counts.total : counts[health];
