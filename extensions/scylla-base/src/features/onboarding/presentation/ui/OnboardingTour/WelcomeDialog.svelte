<script lang="ts">
  import { ScyllaDialog } from '@scylla/ui';
  import { Button, DialogFooter } from '@scylla/ui/shadcn';
  import { t } from '@scylla/ui/i18n';
  import { onboardingMessages } from '../onboarding.messages.ts';

  interface Props {
    open: boolean;
    onStart: () => void;
    onSkip: () => void;
  }

  let { open, onStart, onSkip }: Props = $props();
</script>

<ScyllaDialog
  {open}
  onOpenChange={() => {}}
  dismissible={false}
  class="sm:max-w-[460px]"
  title={t(onboardingMessages.welcomeTitle)}
  description={t(onboardingMessages.welcomeBody)}
>
  <DialogFooter class="items-center gap-2">
    <Button variant="ghost" size="sm" class="text-muted-foreground" onclick={onSkip}>
      {t(onboardingMessages.skipTour)}
    </Button>
    <Button size="sm" onclick={onStart}>{t(onboardingMessages.start)}</Button>
  </DialogFooter>
</ScyllaDialog>
