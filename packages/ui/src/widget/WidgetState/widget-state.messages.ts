import { msg } from '@lingui/core/macro';

export const widgetStateMessages = {
  loading: msg`Loading`,
  errorTitle: msg`Could not load`,
  errorDescription: msg`The server did not answer.`,
  emptyTitle: msg`Nothing to show`,
  emptyDescription: msg`No data matches the period or the scope of this widget.`,
  allClearTitle: msg`All clear`,
  allClearDescription: msg`Nothing needs you now.`,
  lockedTitle: msg`You cannot see this data`,
  lockedDescription: msg`Ask an admin for access.`,
  missingTitle: msg`This item is gone`,
  missingDescription: msg`It was deleted, or you cannot see it any more.`,
};
