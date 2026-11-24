<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { Button } from '@scylla/ui/primitives';
  import { ScyllaError } from '@shared/utils/scylla-error.ts';
  import { rolesMessages } from '../../messages/roles.messages.ts';

  let { error, onRetry }: { error: unknown; onRetry: () => void } = $props();

  const trace = $derived(ScyllaError.from(error).trace());
</script>

<div class="flex flex-col items-center gap-3 rounded-2xl border bg-card p-10 text-center">
  <p class="font-semibold text-destructive">{t(rolesMessages.loadError)}</p>
  <p class="max-w-md text-sm text-muted-foreground">{t(rolesMessages.loadErrorHint)}</p>
  <Button variant="outline" onclick={onRetry}>{t(rolesMessages.retry)}</Button>
  <code class="rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
    {trace}
  </code>
</div>
