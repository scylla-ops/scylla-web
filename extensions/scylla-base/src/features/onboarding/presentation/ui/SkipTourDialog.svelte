<script lang="ts">
  import { ScyllaDialog } from '@scylla/ui';
  import { Button, DialogFooter } from '@scylla/ui/shadcn';
  import { t } from '@scylla/ui/i18n';
  import { onboardingMessages } from '../onboarding.messages.ts';
  import { SCYLLA_DOCS_URL } from '../tour-steps.ts';

  interface Props {
    open: boolean;
    onSkip: () => void;
    onContinue: () => void;
  }

  let { open, onSkip, onContinue }: Props = $props();
</script>

<ScyllaDialog
  {open}
  onOpenChange={next => {
    if (!next) onContinue();
  }}
  class="sm:max-w-[440px]"
  title={t(onboardingMessages.skipTitle)}
  description={t(onboardingMessages.skipBody)}
>
  <a
    href={SCYLLA_DOCS_URL}
    target="_blank"
    rel="noreferrer"
    class="text-[13px] font-semibold text-primary hover:underline"
  >
    {t(onboardingMessages.seeDocumentation)}
  </a>
  <DialogFooter class="items-center gap-2">
    <Button variant="outline" size="sm" onclick={onSkip}>{t(onboardingMessages.confirmSkip)}</Button>
    <Button size="sm" onclick={onContinue}>{t(onboardingMessages.continueTour)}</Button>
  </DialogFooter>
</ScyllaDialog>
