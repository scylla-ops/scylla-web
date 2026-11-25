<script lang="ts">
  import { ConfirmOperationAlertDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { gitEventsMessages as messages } from '@base/features/pipeline/presentation/messages/git-events.messages.ts';
  import type { GitEvents } from './git-events.state.svelte.ts';

  interface Props {
    gitEvents: GitEvents;
  }

  let { gitEvents }: Props = $props();

  const allow = $derived(gitEvents.change === 'allow');
</script>

<!-- An opt-in puts no review on what runs: the dialog says it before an admin allows it. -->
<ConfirmOperationAlertDialog
  open={gitEvents.asking}
  onOpenChange={open => {
    if (!open) gitEvents.cancel();
  }}
  onContinue={() => gitEvents.confirm()}
  title={t(allow ? messages.allowTitle : messages.revokeTitle)}
  description={t(allow ? messages.allowBody : messages.revokeBody)}
  continueLabel={t(allow ? messages.allow : messages.revokeGitEvents)}
  variant={allow ? 'default' : 'destructive'}
  isLoading={gitEvents.isPending}
/>
