export type {
  CreateUserInput,
  UpdateUserInput,
  UserEntity,
  UserSummary,
} from './domain/entities/user.entity.ts';
export type { UserSessionEntity } from './domain/entities/user-session.entity.ts';
export type { IdentityEntity, SignInMethodsOfUser } from './domain/entities/identity.entity.ts';
export {
  canListUsers,
  myIdentityQueries,
  userMutations,
  userQueries,
  ME_QUERY_KEY,
  USERS_QUERY_KEY,
  USER_QUERY_KEY,
  USER_SESSIONS_QUERY_KEY,
} from './presentation/user.queries.ts';
/** Account > Profile, with the card of the photo in view: a click on the own avatar elsewhere. */
export { openProfilePhoto } from './presentation/ui/components/UserAvatarCard/photo-focus.state.svelte.ts';
export type { PersonalTokens } from './domain/entities/personal-tokens.entity.ts';
export {
  personalTokenQueries,
  PERSONAL_TOKENS_QUERY_KEY,
} from './presentation/personal-tokens.queries.ts';
/**
 * The dialog that deletes the account of the session, with its call and the sign-out. The auth
 * guard opens it from the terms step: a person who refuses the terms can leave.
 */
export const loadAccountDeletion = () =>
  import('./presentation/ui/account/AccountDeletion/AccountDeletion.svelte');
