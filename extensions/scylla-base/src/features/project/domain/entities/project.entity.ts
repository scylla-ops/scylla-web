import type { PaginatedList } from '@scylla/ui/structs';

export interface ProjectEntity {
  id: string;
  name: string;
  description?: string;
}

export type ProjectList = PaginatedList<ProjectEntity>;
