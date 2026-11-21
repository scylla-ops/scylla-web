import { createMutation, createQuery, getModuleDomain, getQueryClient } from '@scylla/core-sdk';
import {
  LEGAL_INFO_QUERY_KEY,
  legalQueries,
  termsToAccept,
  type LegalDocument,
} from '@platform/legal';
import type { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { TermsStatus } from '@base/features/login/domain/structs/terms-status.struct.ts';
import type { LoginModule } from '@base/features/login/login.module.ts';
import { TERMS_STATUS_QUERY_KEY } from '../../login.queries.ts';
import { termsRefusalOf, type TermsRefusal } from '../../mappers/terms-refusal.mapper.ts';
import { termsLinks, type TermsLinks } from '../../presenters/linked-text.presenter.ts';

/** Construct it during component initialisation: `createMutation` needs an owner. */
export class TermsStepState {
  private readonly repository = getModuleDomain<typeof LoginModule.domain>('login').loginRepository;

  // Read again at the step: the version to accept must be the current one.
  private readonly legal = createQuery(() => ({ ...legalQueries.info(), staleTime: 0 }));

  #accepted = $state(false);

  /** The server refused the version: the terms changed since the page read them. */
  refusal = $state<TermsRefusal | null>(null);

  private readonly mutation = createMutation<TermsRefusal | null, ScyllaError, string>(() => ({
    // A refusal of the terms shows under the box. Another error: the global handler toasts.
    mutationFn: (version: string) => termsRefusalOf(this.repository.acceptTerms(version)),
    onSuccess: refusal => {
      const client = getQueryClient();
      if (refusal) {
        this.#accepted = false;
        this.refusal = refusal;
        void client.invalidateQueries({ queryKey: LEGAL_INFO_QUERY_KEY() });
      } else {
        // The guard shows the app at once; the read that follows gives the acceptance.
        client.setQueryData<TermsStatus>(
          TERMS_STATUS_QUERY_KEY(),
          status => status && { ...status, acceptanceRequired: false },
        );
      }
      void client.invalidateQueries({ queryKey: TERMS_STATUS_QUERY_KEY() });
    },
  }));

  /** The terms to accept, once the legal settings are read. */
  get terms(): LegalDocument | undefined {
    return termsToAccept(this.legal.data);
  }

  get links(): TermsLinks {
    return termsLinks(this.legal.data);
  }

  /** The box of the terms. A tick removes the refusal. */
  get accepted(): boolean {
    return this.#accepted;
  }

  set accepted(value: boolean) {
    this.#accepted = value;
    if (value) this.refusal = null;
  }

  get isPending(): boolean {
    return this.mutation.isPending;
  }

  get canAccept(): boolean {
    return this.terms !== undefined && this.#accepted && !this.mutation.isPending;
  }

  accept = (): void => {
    const terms = this.terms;
    if (!terms || !this.#accepted) return;
    this.mutation.mutate(terms.version);
  };
}
