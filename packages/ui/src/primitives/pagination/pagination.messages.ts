import { msg } from '@lingui/core/macro';

/**
 * The vendored pagination's own strings.
 *
 * In a `.ts` rather than in the components: `lingui extract` does not read
 * `.svelte`, and the ids here are the ones `shadcn/pagination.tsx` already
 * carries, so the French translations follow.
 */
export const paginationMessages = {
  pagination: msg`Pagination`,
  goToPrevious: msg`Go to previous page`,
  goToNext: msg`Go to next page`,
};
