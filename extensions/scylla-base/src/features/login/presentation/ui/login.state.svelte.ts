import { createMutation, getModuleDomain } from '@scylla/core-sdk';
import { navigateTo } from '@platform/context';
import type { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { LogoMarkState } from '@shared/presentation/ui/layout/LogoMark/logo-mark.ts';
import type { LoginModule } from '@base/features/login/login.module.ts';
import { returnPathOf } from '../mappers/return-path.mapper.ts';
import { signInOutcomeOf, type SignInOutcome } from '../mappers/sign-in-outcome.mapper.ts';
import { arrival } from './ArrivalOverlay/arrival.state.svelte.ts';

export interface Credentials {
  /** An email or a username. */
  identifier: string;
  password: string;
}

/** Construct it during component initialisation: `createMutation` needs an owner. */
export class LoginState {
  private readonly repository = getModuleDomain<typeof LoginModule.domain>('login')
    .loginRepository;

  /** An account that waits for the check of its email is the page's own state, not a toast. */
  private readonly mutation = createMutation<SignInOutcome, ScyllaError, Credentials>(() => ({
    mutationFn: ({ identifier, password }: Credentials) =>
      signInOutcomeOf(this.repository.login(identifier, password)),
    // The return path of `loginPath`, else `/`, which redirects to an workspace.
    // `replace` keeps this page out of the history. The arrival opens it when the panel covers
    // the screen.
    onSuccess: outcome => {
      if (outcome !== 'signed-in') return;
      arrival.begin(() => navigateTo(returnPathOf(window.location.hash) ?? '/', { replace: true }));
    },
    // No `onError`: the global handler toasts.
  }));

  /** The server opened a session. */
  private get signedIn(): boolean {
    return this.mutation.isSuccess && this.mutation.data === 'signed-in';
  }

  /** From the submit until the redirect: the form stays disabled. */
  get isPending(): boolean {
    return this.mutation.isPending || this.signedIn;
  }

  /** The password is right, but the account waits for the check of its email. */
  get emailNotVerified(): boolean {
    return this.mutation.data === 'email-not-verified';
  }

  /**
   * The email of the refused sign-in, to send the link again. `undefined` for a handle: the
   * person then types the email.
   */
  get unverifiedEmail(): string | undefined {
    const identifier = this.emailNotVerified ? this.mutation.variables?.identifier : undefined;
    return identifier?.includes('@') ? identifier.trim() : undefined;
  }

  /**
   * The dots of the mark of the panel: grey while the request runs or the tab leaves for a
   * provider, lit once the request succeeds.
   */
  get mark(): LogoMarkState {
    if (this.signedIn) return 'lit';
    return this.mutation.isPending || arrival.leaving ? 'waiting' : 'idle';
  }

  /** The panel closes over the form. */
  get isLeaving(): boolean {
    return arrival.formLeaves;
  }

  submit = (identifier: string, password: string): void => {
    this.mutation.mutate({ identifier, password });
  };
}
