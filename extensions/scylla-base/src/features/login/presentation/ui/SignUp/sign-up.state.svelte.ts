import { createMutation, createQuery, getModuleDomain, getQueryClient } from '@scylla/core-sdk';
import {
  LEGAL_INFO_QUERY_KEY,
  legalQueries,
  termsToAccept,
  type LegalDocument,
} from '@platform/legal';
import type { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { SignUpInput } from '@base/features/login/domain/repository/login.repository.ts';
import type { LoginModule } from '@base/features/login/login.module.ts';
import { takeFromFragment } from '../../mappers/fragment-token.mapper.ts';
import { termsRefusalOf, type TermsRefusal } from '../../mappers/terms-refusal.mapper.ts';
import { termsLinks, type TermsLinks } from '../../presenters/linked-text.presenter.ts';

/** Construct it during component initialisation: `createMutation` needs an owner. */
export class SignUpState {
  private readonly repository = getModuleDomain<typeof LoginModule.domain>('login').loginRepository;

  /** The token of an invitation link: `/sign-up#invitation=…`. */
  private readonly invitationToken = takeFromFragment('invitation') ?? '';

  private readonly legal = createQuery(() => legalQueries.info());

  #acceptedTerms = $state(false);

  /** The server refused the version of the terms: they changed while the person filled in the form. */
  termsRefusal = $state<TermsRefusal | null>(null);

  private readonly mutation = createMutation<TermsRefusal | null, ScyllaError, SignUpInput>(() => ({
    // A refusal of the terms shows under the box. Another error: the global handler toasts,
    // with the text of the refusal code.
    mutationFn: (input: SignUpInput) => termsRefusalOf(this.repository.signUp(input)),
    onSuccess: refusal => {
      if (!refusal) return;
      this.#acceptedTerms = false;
      this.termsRefusal = refusal;
      void getQueryClient().invalidateQueries({ queryKey: LEGAL_INFO_QUERY_KEY() });
    },
  }));

  /** The terms that the person must accept, or `undefined`: no box. */
  get terms(): LegalDocument | undefined {
    return termsToAccept(this.legal.data);
  }

  get links(): TermsLinks {
    return termsLinks(this.legal.data);
  }

  /** The box of the terms. A tick removes the refusal. */
  get acceptedTerms(): boolean {
    return this.#acceptedTerms;
  }

  set acceptedTerms(value: boolean) {
    this.#acceptedTerms = value;
    if (value) this.termsRefusal = null;
  }

  /** The form can go: the person ticked the box, or the terms need no acceptance. */
  get canSubmit(): boolean {
    return !this.terms || this.#acceptedTerms;
  }

  get isPending(): boolean {
    return this.mutation.isPending;
  }

  /** The server sent a mail. The answer is the same for a known email. */
  get isSent(): boolean {
    return this.mutation.isSuccess && this.mutation.data === null;
  }

  /** The email of the sign-up that the server took: empty before. */
  get sentEmail(): string {
    return this.isSent ? (this.mutation.variables?.email ?? '') : '';
  }

  /** The sign-up came from an invitation link: the email needs no link. */
  get invited(): boolean {
    return this.invitationToken !== '';
  }

  submit = (input: Omit<SignUpInput, 'invitationToken' | 'acceptedTermsVersion'>): void => {
    const terms = this.terms;
    this.mutation.mutate({
      email: input.email.trim(),
      password: input.password,
      displayName: input.displayName.trim(),
      invitationToken: this.invitationToken,
      ...(terms && this.#acceptedTerms && { acceptedTermsVersion: terms.version }),
    });
  };
}
