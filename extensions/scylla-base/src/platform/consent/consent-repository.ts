import { grpcTransport } from '@platform/grpc';
import { ConsentServiceClient } from '@base/generated/scylla/platform/v1/consent_service.client.ts';
import type { ConsentRepository } from './domain/repository/consent.repository.ts';
import { DefaultConsentRepository } from './infrastructure/default-consent.repository.ts';

// A capability has no module file: the repository is made here, on the first use.
let current: ConsentRepository | null = null;

/** The repository of the consent. */
export const consentRepository = (): ConsentRepository =>
  (current ??= new DefaultConsentRepository(
    new ConsentServiceClient(grpcTransport.getTransport()),
  ));

/** For a test: uses this repository, and gives the function that restores the previous one. */
export const withConsentRepository = (repository: ConsentRepository): (() => void) => {
  const previous = current;
  current = repository;
  return () => {
    current = previous;
  };
};
