/** `secretsOf` and `accessOf` check `READ_APP` themselves. */
export type {
  AppEntity,
  AppSecretEntity,
  AppAccess,
  CreatedApp,
  CreatedAppSecret,
  ResetAppSecret,
} from './domain/entities/app.entity.ts';
export type { SecretLabelIssue } from './domain/structs/secret-label.struct.ts';
export {
  SECRET_LABEL_MAX_BYTES,
  normalizeSecretLabel,
  secretLabelIssue,
  suggestSecretLabel,
  trimSecretLabel,
} from './domain/structs/secret-label.struct.ts';
export {
  appQueries,
  appMutations,
  APPS_QUERY_KEY,
  APP_QUERY_KEY,
  APP_SECRETS_QUERY_KEY,
  APP_ACCESS_QUERY_KEY,
} from './presentation/apps.queries.ts';
