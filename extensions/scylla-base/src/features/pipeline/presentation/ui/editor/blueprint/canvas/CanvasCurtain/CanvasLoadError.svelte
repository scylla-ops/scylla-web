<script lang="ts">
  import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
  import { StatusShape } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { blueprintMessages } from '@base/features/pipeline/presentation/messages/blueprint.messages.ts';

  interface Props {
    onRetry: () => void;
  }

  let { onRetry }: Props = $props();
</script>

<!-- The four dots of the logo in the failed form, as for a job. The title says it in words. -->
<div class="pointer-events-auto flex flex-col items-center gap-2 text-center">
  <div aria-hidden="true">
    <StatusShape state="failed" label={t(blueprintMessages.loadFailed)} />
  </div>
  <h2 class="mt-1 text-lg text-destructive">{t(blueprintMessages.loadFailed)}</h2>
  <p class="text-sm text-muted-foreground">{t(blueprintMessages.loadFailedHint)}</p>
  <Button variant="outline" size="sm" class="mt-1" onclick={onRetry}>
    <RotateCcwIcon />
    {t(blueprintMessages.retry)}
  </Button>
</div>
