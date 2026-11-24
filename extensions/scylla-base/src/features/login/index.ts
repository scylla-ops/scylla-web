export { LoginState, type Credentials } from './presentation/ui/login.state.svelte.ts';
export { arrival } from './presentation/ui/ArrivalOverlay/arrival.state.svelte.ts';
export { loginPoints, type LoginZoneContext } from './presentation/login.points.ts';
export { closeSession, hasSession, openSession, sessionUserId } from './infrastructure/session.ts';
export { signOut } from './presentation/sign-out.ts';
export { loginPath, loginPathBackTo } from './presentation/mappers/return-path.mapper.ts';
export { providerStartUrl } from './presentation/mappers/provider-start.mapper.ts';
export { loginQueries, TERMS_STATUS_QUERY_KEY } from './presentation/login.queries.ts';
/** The full-page terms step: the auth guard shows it before the app (`loginQueries.terms`). */
export const loadTermsStep = () => import('./presentation/ui/TermsStep/TermsStep.svelte');
export type { PasswordResetDelivery } from './domain/structs/password-reset-delivery.struct.ts';
export type {
  SignInMethods,
  SignInProvider,
  SignUpMode,
} from './domain/structs/sign-in-methods.struct.ts';
export type { TermsAcceptance, TermsStatus } from './domain/structs/terms-status.struct.ts';
