import type { UserSummary } from '@base/features/user';
import { userSecondaryLine } from '@shared/presentation/presenters/user-identity.presenter.ts';
import { memberProfile } from './member-rows.presenter.ts';

export interface ActorChoice {
  id: string;
  name: string;
  /** The second line of the row. */
  hint?: string;
  /** More text for the search. */
  keywords?: readonly (string | undefined)[];
}

/** The directory gives the email when the caller can read it. */
export const memberChoice = (
  row: { actorId: string; name: string; handle: string },
  user?: UserSummary,
): ActorChoice => {
  const email = user?.email ?? '';
  return {
    id: row.actorId,
    name: row.name,
    hint: userSecondaryLine({ ...memberProfile(row), email }),
    keywords: [row.handle, email],
  };
};
