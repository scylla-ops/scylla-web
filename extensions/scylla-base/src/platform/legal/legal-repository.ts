import { grpcTransport } from '@platform/grpc';
import { LegalServiceClient } from '@base/generated/scylla/platform/v1/legal_service.client.ts';
import type { LegalRepository } from './domain/repository/legal.repository.ts';
import { DefaultLegalRepository } from './infrastructure/default-legal.repository.ts';

// A capability has no module file: the repository is made here, on the first read.
let current: LegalRepository | null = null;

/** The repository of the legal settings. */
export const legalRepository = (): LegalRepository =>
  (current ??= new DefaultLegalRepository(new LegalServiceClient(grpcTransport.getTransport())));

/** For a test: uses this repository, and gives the function that restores the previous one. */
export const withLegalRepository = (repository: LegalRepository): (() => void) => {
  const previous = current;
  current = repository;
  return () => {
    current = previous;
  };
};
