<script lang="ts">
  import { ErrorState } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { triggersMessages } from '@base/features/triggers/presentation/ui/triggers.messages.ts';
  import TriggerEditorView from '../components/trigger-form/TriggerEditorView/TriggerEditorView.svelte';

  interface Props {
    pipelineId?: string;
    projectId?: string;
    /** Absent when creating. */
    triggerId?: string;
  }

  let { pipelineId, projectId, triggerId }: Props = $props();
</script>

{#if !pipelineId || !projectId}
  <ErrorState message={t(triggersMessages.pipelineIdMissing)} />
{:else}
  <TriggerEditorView {pipelineId} {triggerId} />
{/if}
