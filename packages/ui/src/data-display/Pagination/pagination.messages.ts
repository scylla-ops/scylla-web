import { msg } from '@lingui/core/macro';

export const paginationMessages = {
  /** Keep the placeholder names: they are part of the msgid. */
  range: (start: number, end: number, totalCount: number) => msg`${start}–${end} of ${totalCount}`,
  pageOf: (page: number, totalPages: number) => msg`Page ${page} of ${totalPages}`,
};
