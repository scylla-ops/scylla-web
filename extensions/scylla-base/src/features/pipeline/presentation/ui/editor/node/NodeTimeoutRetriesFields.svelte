<script lang="ts">
  import { Input, Label } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { MAX_RETRIES, MAX_TIMEOUT_SECONDS, type NodeDraft } from './node-draft.state.svelte.ts';
  import { nodeMessages } from '@base/features/pipeline/presentation/messages/node.messages.ts';

  interface Props {
    draft: NodeDraft;
  }

  let { draft }: Props = $props();

  const uid = $props.id();
</script>

<div class="grid grid-cols-2 gap-4">
  <div class="flex flex-col gap-2">
    <Label for="{uid}-timeout">{t(nodeMessages.timeoutSeconds)}</Label>
    <Input
      id="{uid}-timeout"
      type="number"
      min="1"
      max={MAX_TIMEOUT_SECONDS}
      value={draft.timeoutSeconds}
      oninput={event => (draft.timeoutSeconds = event.currentTarget.value)}
      placeholder={t(nodeMessages.noTimeout)}
      aria-invalid={draft.timeoutInvalid}
      aria-describedby={draft.timeoutInvalid ? `${uid}-timeout-error` : undefined}
    />
    {#if draft.timeoutInvalid}
      <p id="{uid}-timeout-error" class="text-xs text-destructive">
        {t(nodeMessages.timeoutRange)}
      </p>
    {/if}
  </div>
  <div class="flex flex-col gap-2">
    <Label for="{uid}-retries">{t(nodeMessages.retries)}</Label>
    <Input
      id="{uid}-retries"
      type="number"
      min="0"
      max={MAX_RETRIES}
      value={draft.retries}
      oninput={event => (draft.retries = event.currentTarget.value)}
      aria-invalid={draft.retriesInvalid}
      aria-describedby={draft.retriesInvalid ? `${uid}-retries-error` : undefined}
    />
    {#if draft.retriesInvalid}
      <p id="{uid}-retries-error" class="text-xs text-destructive">
        {t(nodeMessages.retriesRange)}
      </p>
    {/if}
  </div>
</div>
