import type {
  GetMeResponse,
  TermsAcceptance as GrpcTermsAcceptance,
} from '@base/generated/scylla/accounts/v1/profile_service.ts';
import { timestampToIso } from '@shared/infrastructure/grpc/wrappers.ts';
import type {
  TermsAcceptance,
  TermsStatus,
} from '@base/features/login/domain/structs/terms-status.struct.ts';

export const termsAcceptanceToDomain = (acceptance: GrpcTermsAcceptance): TermsAcceptance => ({
  version: acceptance.version,
  acceptedAt: timestampToIso(acceptance.acceptedAt),
});

export const termsStatusToDomain = (me: GetMeResponse): TermsStatus => ({
  acceptanceRequired: me.termsAcceptanceRequired,
  accepted: me.acceptedTerms ? termsAcceptanceToDomain(me.acceptedTerms) : null,
  displayName: me.user?.displayName ?? '',
  email: me.user?.email ?? '',
});
