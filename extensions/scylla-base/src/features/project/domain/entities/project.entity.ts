import type { PaginationInfo } from '@scylla/ui/structs';

export interface ProjectEntity {
  id: string;
  name: string;
  description?: string;
}

export interface ProjectList {
  projects: ProjectEntity[];
  pagination: PaginationInfo;
}
