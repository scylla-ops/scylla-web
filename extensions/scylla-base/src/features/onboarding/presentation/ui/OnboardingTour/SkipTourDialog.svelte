<script lang="ts">
  import { fade } from 'svelte/transition';
  import { ScyllaDialog, motionDuration } from '@scylla/ui';
  import { Button, DialogFooter } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    onboardingMessages,
  } from '@base/features/onboarding/presentation/messages/onboarding.messages.ts';
  import { SCYLLA_DOCS_URL } from './tour-steps.registry.ts';
  import { portalToBody } from './tour-tracking.attachments.svelte.ts';

  interface Props {
    open: boolean;
    onSkip: () => void;
    onContinue: () => void;
  }

  let { open, onSkip, onContinue }: Props = $props();
</script>

{#if open}
  <div
    {@attach portalToBody}
    out:fade={{ duration: motionDuration(150) }}
    class="fixed inset-0 z-[205] bg-black/80"
    data-tour-skip-backdrop
    aria-hidden="true"
  ></div>
{/if}

<ScyllaDialog
  {open}
  onOpenChange={next => {
    if (!next) onContinue();
  }}
  class="z-[210] sm:max-w-[440px]"
  title={t(onboardingMessages.skipTitle)}
  description={t(onboardingMessages.skipBody)}
>
  <a
    href={SCYLLA_DOCS_URL}
    target="_blank"
    rel="noreferrer"
    class="text-[13px] font-semibold text-primary hover:underline"
  >
    {t(onboardingMessages.readTheDocs)}
  </a>
  <DialogFooter class="items-center gap-2">
    <Button variant="outline" size="sm" onclick={onSkip}>{t(onboardingMessages.confirmSkip)}</Button>
    <Button size="sm" onclick={onContinue}>{t(onboardingMessages.continueTour)}</Button>
  </DialogFooter>
</ScyllaDialog>
