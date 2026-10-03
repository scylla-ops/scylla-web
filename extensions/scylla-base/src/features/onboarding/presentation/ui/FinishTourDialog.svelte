<script lang="ts">
  import { ScyllaDialog } from '@scylla/ui';
  import { Button, DialogFooter, buttonVariants } from '@scylla/ui/shadcn';
  import { t } from '@scylla/ui/i18n';
  import { onboardingMessages } from '../onboarding.messages.ts';
  import { SCYLLA_DOCS_URL } from '../tour-steps.ts';

  interface Props {
    onFinish: () => void;
  }

  let { onFinish }: Props = $props();
</script>

<ScyllaDialog
  open
  onOpenChange={() => {}}
  dismissible={false}
  class="sm:max-w-[500px]"
  title={t(onboardingMessages.finishTitle)}
  description={t(onboardingMessages.finishBody)}
>
  <DialogFooter class="items-center gap-2">
    <a
      href={SCYLLA_DOCS_URL}
      target="_blank"
      rel="noreferrer"
      class={buttonVariants({ variant: 'outline', size: 'sm' })}
    >
      {t(onboardingMessages.openDocumentation)}
    </a>
    <Button size="sm" onclick={onFinish}>{t(onboardingMessages.finish)}</Button>
  </DialogFooter>
</ScyllaDialog>
