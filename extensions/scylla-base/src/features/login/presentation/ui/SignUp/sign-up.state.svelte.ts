import { createMutation, getModuleDomain } from '@scylla/core-sdk';
import type { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { SignUpInput } from '@base/features/login/domain/repository/login.repository.ts';
import type { LoginModule } from '@base/features/login/login.module.ts';
import { takeFromFragment } from '../../mappers/fragment-token.mapper.ts';

/** Construct it during component initialisation: `createMutation` needs an owner. */
export class SignUpState {
  private readonly repository = getModuleDomain<typeof LoginModule.domain>('login').loginRepository;

  /** The token of an invitation link: `/sign-up#invitation=…`. */
  private readonly invitationToken = takeFromFragment('invitation') ?? '';

  private readonly mutation = createMutation<void, ScyllaError, SignUpInput>(() => ({
    mutationFn: (input: SignUpInput) => this.repository.signUp(input),
    // No `onError`: the global handler toasts, with the text of the refusal code.
  }));

  get isPending(): boolean {
    return this.mutation.isPending;
  }

  /** The server sent a mail. The answer is the same for a known email. */
  get isSent(): boolean {
    return this.mutation.isSuccess;
  }

  submit = (input: Omit<SignUpInput, 'invitationToken'>): void => {
    this.mutation.mutate({
      email: input.email.trim(),
      password: input.password,
      displayName: input.displayName.trim(),
      invitationToken: this.invitationToken,
    });
  };
}
