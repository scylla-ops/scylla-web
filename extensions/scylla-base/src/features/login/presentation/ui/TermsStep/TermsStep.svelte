<script lang="ts">
  import LogOutIcon from '@lucide/svelte/icons/log-out';
  import UserRoundIcon from '@lucide/svelte/icons/user-round';
  import { Badge, Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { LegalFooter } from '@platform/legal';
  import AuthLayout from '@shared/presentation/ui/layout/AuthLayout.svelte';
  import type { TermsStatus } from '@base/features/login/domain/structs/terms-status.struct.ts';
  import { termsMessages as m } from '@base/features/login/presentation/messages/terms.messages.ts';
  import { linkSlot } from '@base/features/login/presentation/presenters/linked-text.presenter.ts';
  import {
    termsChangedText,
    termsStepView,
  } from '@base/features/login/presentation/presenters/terms.presenter.ts';
  import { signOut } from '@base/features/login/presentation/sign-out.ts';
  import LinkedText from '../LinkedText/LinkedText.svelte';
  import TermsCheckbox from '../TermsCheckbox/TermsCheckbox.svelte';
  import { TermsStepState } from './terms-step.state.svelte.ts';

  interface Props {
    /** The terms of the user of the session: the auth guard shows this step when it must accept. */
    status: TermsStatus;
  }

  let { status }: Props = $props();

  // Built during initialisation: its query and its mutation need an owner.
  const state = new TermsStepState();

  const view = $derived(termsStepView(status, state.terms));
  const readSentence = $derived(
    state.links.privacy
      ? t(m.readBefore(linkSlot('terms'), linkSlot('privacy')))
      : t(m.readBeforeNoPrivacy(linkSlot('terms'))),
  );
  const who = $derived([status.displayName, status.email].filter(Boolean).join(' · '));
</script>

<!-- The legal links that the operator turned on, at the bottom of the frame. -->
{#snippet legalFooter()}
  <LegalFooter class="pt-6" />
{/snippet}

<!-- A full page before the app: the user accepts the terms, or signs out. -->
<AuthLayout footer={legalFooter} title={view.title} description={view.description}>
  <div class="flex flex-col gap-4">
    {#if view.update}
      {#if view.version || view.effectiveOn}
        <div class="flex flex-wrap items-center justify-center gap-2 rounded-lg border p-3">
          {#if view.version}
            <Badge variant="outline">{view.version}</Badge>
          {/if}
          {#if view.effectiveOn}
            <span class="text-xs text-muted-foreground">{view.effectiveOn}</span>
          {/if}
        </div>
      {/if}
    {:else if who}
      <div class="flex items-center justify-center gap-3 rounded-lg border p-3">
        <UserRoundIcon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div class="flex min-w-0 flex-col gap-0.5">
          <p class="text-xs text-muted-foreground">{t(m.signedInAs)}</p>
          <p class="truncate text-sm font-medium">{who}</p>
        </div>
      </div>
    {/if}

    {#if state.terms}
      <p class="text-center text-sm text-muted-foreground">
        <LinkedText sentence={readSentence} links={state.links} />
      </p>
      <TermsCheckbox
        terms={state.terms}
        links={state.links}
        bind:checked={state.accepted}
        withVersion={view.update}
        centered
        error={state.refusal ? termsChangedText(state.refusal, false) : undefined}
      />
    {/if}

    <div class="flex flex-col gap-2">
      <Button class="w-full" disabled={!state.canAccept} onclick={state.accept}>
        {t(m.acceptAndContinue)}
      </Button>
      <Button variant="ghost" class="w-full" onclick={() => void signOut()}>
        <LogOutIcon aria-hidden="true" />
        {t(m.signOut)}
      </Button>
    </div>
  </div>
</AuthLayout>
