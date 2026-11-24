<script lang="ts">
  import { Button } from '@scylla/ui/primitives';
  import { FormItemType, ScyllaForm, type FormItem } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import {
    checkDisplayName,
    checkEmail,
    checkNewPassword,
    checkPasswordConfirmation,
  } from '@shared/utils/account-validation.ts';
  import { SignUpState } from './sign-up.state.svelte.ts';
  import AuthLayout from '@shared/presentation/ui/layout/AuthLayout.svelte';
  import { LegalFooter } from '@platform/legal';
  import { signUpMessages } from '@base/features/login/presentation/messages/sign-up.messages.ts';
  import { termsMessages } from '@base/features/login/presentation/messages/terms.messages.ts';
  import { linkSlot } from '@base/features/login/presentation/presenters/linked-text.presenter.ts';
  import { termsChangedText } from '@base/features/login/presentation/presenters/terms.presenter.ts';
  import LinkedText from '../LinkedText/LinkedText.svelte';
  import TermsCheckbox from '../TermsCheckbox/TermsCheckbox.svelte';

  // Built during initialisation: it reads the invitation of the link, and its mutation needs an owner.
  const state = new SignUpState();

  type Ids = 'displayName' | 'email' | 'password' | 'confirmPassword';

  const items: readonly FormItem<Ids>[] = $derived([
    {
      id: 'displayName',
      label: t(signUpMessages.displayName),
      placeholder: t(signUpMessages.displayNamePlaceholder),
      type: FormItemType.Input,
      inputType: 'text',
      autocomplete: 'name',
      validate: checkDisplayName,
    },
    {
      id: 'email',
      label: t(signUpMessages.email),
      placeholder: t(signUpMessages.emailPlaceholder),
      type: FormItemType.Input,
      inputType: 'email',
      autocomplete: 'email',
      validate: checkEmail,
    },
    {
      id: 'password',
      label: t(signUpMessages.password),
      type: FormItemType.Input,
      inputType: 'password',
      autocomplete: 'new-password',
      validate: checkNewPassword,
    },
    {
      id: 'confirmPassword',
      label: t(signUpMessages.confirmPassword),
      type: FormItemType.Input,
      inputType: 'password',
      autocomplete: 'new-password',
      validate: (value, values) => checkPasswordConfirmation(value, values.password),
    },
  ]);
</script>

<!-- The legal links that the operator turned on, at the bottom of the frame. -->
{#snippet legalFooter()}
  <LegalFooter class="pt-6" />
{/snippet}

<AuthLayout
  footer={legalFooter}
  title={t(signUpMessages.title)}
  description={state.isSent ? undefined : t(signUpMessages.description)}
>
  {#if state.isSent}
    <p role="status" class="text-center text-sm">{t(signUpMessages.sent)}</p>
  {:else}
    <ScyllaForm {items} onSubmit={state.submit} isPending={state.isPending}>
      {#snippet footer({ isValid, isPending })}
        <!-- No box when the operator asks no acceptance of the terms. -->
        {#if state.terms}
          <TermsCheckbox
            terms={state.terms}
            links={state.links}
            bind:checked={state.acceptedTerms}
            error={state.termsRefusal ? termsChangedText(state.termsRefusal, true) : undefined}
          />
        {/if}
        <Button
          type="submit"
          class="mt-2 w-full"
          disabled={!isValid || isPending || !state.canSubmit}
        >
          {t(signUpMessages.submit)}
        </Button>
      {/snippet}
    </ScyllaForm>
    {#if state.links.privacy}
      <p class="mt-4 text-center text-xs text-muted-foreground">
        <LinkedText
          sentence={t(termsMessages.privacyNote(linkSlot('privacy')))}
          links={state.links}
        />
      </p>
    {/if}
  {/if}

  <a
    href="/login"
    class="mt-6 block text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
  >
    {t(signUpMessages.haveAccount)}
  </a>
</AuthLayout>
