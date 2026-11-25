<script lang="ts">
  import type { MessageDescriptor } from '@lingui/core';
  import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
  import CloudCheckIcon from '@lucide/svelte/icons/cloud-check';
  import FileDownIcon from '@lucide/svelte/icons/file-down';
  import Loader2Icon from '@lucide/svelte/icons/loader-2';
  import SaveIcon from '@lucide/svelte/icons/save';
  import { Permission, can } from '@platform/authz';
  import { TabsList, TabsTrigger } from '@scylla/ui/primitives';
  import { GatedButton } from '@scylla/ui';
  import { cn } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import { exportMessages } from '@base/features/pipeline/presentation/messages/export.messages.ts';
  import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';
  import type { MissingDocument } from '../pipeline-document.state.svelte.ts';
  import PipelineLabelsButton from './PipelineLabelsButton.svelte';
  import PipelineNameField from './PipelineNameField.svelte';

  interface Props {
    onSubmit: () => void;
    submitLabel: string;
    /** `edit` tracks the unsaved changes; `create` does not. */
    mode: 'create' | 'edit';
    /** No document to name, to edit or to save: no status, and Save is disabled. */
    missing?: MissingDocument;
    submitDisabled?: boolean;
    /** Why the pipeline cannot be saved: shown in place of the save status, and Save is disabled. */
    issue?: string;
    /** So that an invalid script is not overwritten from the blueprint. */
    blueprintDisabled?: boolean;
    isDirty: boolean;
    isSaving?: boolean;
    /** The message of the last save that failed: the changes are still unsaved. */
    saveError?: string;
    pipelineName: string;
    onNameChange: (name: string) => void;
    /** The text of the name field at each key, before it is applied. */
    onNameDraft?: (name: string) => void;
    /** A saved pipeline: the header shows Export, which writes it as a file of the repository. */
    onExport?: () => void;
    /** Why the saved pipeline cannot be exported: Export shows it and opens nothing. */
    exportIssue?: string;
    /** A saved pipeline: the header shows its agent labels, which save at once. */
    pipelineId?: string;
    /** The saved agent labels of the pipeline, or the labels of a new pipeline. */
    agentLabels?: readonly string[];
    /** A new pipeline: the header shows its agent labels, which Create sends. */
    onAgentLabelsChange?: (labels: string[]) => void;
  }

  let {
    onSubmit,
    submitLabel,
    mode,
    missing,
    submitDisabled = false,
    issue,
    blueprintDisabled = false,
    isDirty,
    isSaving = false,
    saveError,
    pipelineName,
    onNameChange,
    onNameDraft,
    onExport,
    exportIssue,
    pipelineId,
    agentLabels,
    onAgentLabelsChange,
  }: Props = $props();

  type SaveStatus = 'draft' | 'saving' | 'error' | 'dirty' | 'saved';

  const STATUS_LABEL: Record<SaveStatus, MessageDescriptor> = {
    draft: pipelineMessages.statusDraft,
    saving: pipelineMessages.statusSaving,
    error: pipelineMessages.statusError,
    dirty: pipelineMessages.statusDirty,
    saved: pipelineMessages.statusSaved,
  };

  const status = $derived<SaveStatus>(
    isSaving
      ? 'saving'
      : saveError !== undefined
        ? 'error'
        : mode === 'create'
          ? 'draft'
          : isDirty
            ? 'dirty'
            : 'saved',
  );

  const statusText = $derived(
    status === 'error' && saveError ? saveError : t(STATUS_LABEL[status]),
  );

  const canExport = $derived(can(Permission.READ_PIPELINE));

  const canSubmit = $derived(
    can(mode === 'create' ? Permission.CREATE_PIPELINE : Permission.UPDATE_PIPELINE),
  );
</script>

<!--
  One row. Narrower than `2xl` (the editor is the container), the name takes a row of its own, and
  the tabs and the actions go on the row below it.
-->
<div class="flex w-full flex-wrap items-center justify-between gap-3">
  <!-- The name comes first, at the very left: a long name grows to the right, the tabs follow it. -->
  <div class="flex min-w-0 flex-1 items-center gap-3 @max-2xl:contents">
    <!-- An invalid script has no name to edit: `blueprintDisabled` says so. -->
    <div class="min-w-0 @max-2xl:basis-full">
      {#key pipelineName}
        <PipelineNameField
          name={pipelineName}
          {onNameChange}
          onDraftChange={onNameDraft}
          loading={missing === 'loading'}
          disabled={blueprintDisabled || missing === 'failed'}
        />
      {/key}
    </div>

    <TabsList class="shrink-0">
      <TabsTrigger value="scripting" disabled={!!missing}>
        {t(pipelineMessages.scripting)}
      </TabsTrigger>
      <TabsTrigger value="blueprint" disabled={blueprintDisabled}>
        {t(pipelineMessages.blueprint)}
      </TabsTrigger>
    </TabsList>
  </div>

  <div class="flex shrink-0 items-center gap-3 @max-2xl:ml-auto @max-2xl:min-w-0 @max-2xl:shrink">
    {#if missing}
      <!-- No status for a document that is not here. -->
    {:else if issue}
      <p role="alert" class="max-w-md text-sm text-destructive">{issue}</p>
    {:else}
      <!-- A discreet icon: the label is its tooltip and what a screen reader says. -->
      <span
        role="status"
        title={statusText}
        class={cn(
          'inline-flex size-8 shrink-0 items-center justify-center transition-colors duration-300',
          status === 'dirty' && 'text-warning-strong',
          status === 'error' && 'text-destructive',
          status !== 'dirty' && status !== 'error' && 'text-muted-foreground',
        )}
      >
        {#key status}
          <span class="inline-flex animate-in items-center justify-center fade-in-0 duration-150">
            {#if status === 'saving'}
              <Loader2Icon class="size-4 animate-spin" />
            {:else if status === 'error'}
              <CircleAlertIcon class="size-4" />
            {:else if status === 'saved'}
              <CloudCheckIcon class="size-4" />
            {:else}
              <SaveIcon class="size-4" />
            {/if}
          </span>
        {/key}
        <span class="sr-only">{statusText}</span>
      </span>
    {/if}

    {#if agentLabels && (pipelineId || onAgentLabelsChange)}
      <PipelineLabelsButton
        {pipelineId}
        labels={agentLabels}
        onChange={onAgentLabelsChange}
        disabled={!!missing}
      />
    {/if}

    {#if onExport}
      <GatedButton
        variant="outline"
        allowed={canExport && !exportIssue}
        deniedReason={canExport ? exportIssue : t(exportMessages.exportDenied)}
        onclick={onExport}
        disabled={!!missing}
      >
        <FileDownIcon />
        <!-- A narrow header shows the icon only; the name stays for a screen reader. -->
        <span class="max-md:sr-only">{t(exportMessages.export)}</span>
      </GatedButton>
    {/if}

    <GatedButton
      allowed={canSubmit}
      deniedReason={mode === 'create'
        ? t(pipelineMessages.createDenied)
        : t(pipelineMessages.editDenied)}
      onclick={onSubmit}
      disabled={submitDisabled || !!missing || !!issue || isSaving || (mode === 'edit' && !isDirty)}
      data-tour="pipeline-submit"
    >
      {#if isSaving}<Loader2Icon class="mr-2 size-4 animate-spin" />{/if}
      {submitLabel}
    </GatedButton>
  </div>
</div>
