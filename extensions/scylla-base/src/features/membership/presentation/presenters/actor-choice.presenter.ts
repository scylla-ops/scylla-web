import type { AppEntity } from '@base/features/apps';
import type { UserSummary } from '@base/features/user';
import {
  userSecondaryLine,
  type IdentityKind,
} from '@shared/presentation/presenters/user-identity.presenter.ts';
import { memberProfile } from './member-rows.presenter.ts';

export interface ActorChoice {
  id: string;
  name: string;
  kind: IdentityKind;
  /** The handle of a person. */
  handle?: string;
  /** The text after the name of a person. */
  hint?: string;
  /** More text for the search. */
  keywords?: readonly (string | undefined)[];
}

/** The directory gives the email when the caller can read it. */
export const memberChoice = (
  row: { actorId: string; name: string; handle: string; kind: IdentityKind },
  user?: UserSummary,
): ActorChoice => {
  const email = user?.email ?? '';
  return {
    id: row.actorId,
    name: row.name,
    kind: row.kind,
    handle: row.handle,
    hint: userSecondaryLine({ ...memberProfile(row), email }),
    keywords: [row.handle, email],
  };
};

export const appChoice = (app: Pick<AppEntity, 'id' | 'name' | 'runner'>): ActorChoice => ({
  id: app.id,
  name: app.name,
  kind: app.runner ? 'agent' : 'app',
});
