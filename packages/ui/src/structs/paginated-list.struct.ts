import type { PaginationInfo } from './pagination.struct.ts';

export type PaginatedList<T> = {
  readonly items: T[];
  readonly pagination: PaginationInfo;
};
