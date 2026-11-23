<script lang="ts">
  import { Button, Checkbox, Input, Label } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { FragmentEntity } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import { nodeIdIssueText } from '@base/features/pipeline/presentation/presenters/node-issue.presenter.ts';
  import type { EditorLibrary } from '../editor-library.state.svelte.ts';
  import { createSaveFragment } from './save-fragment.state.svelte.ts';
  import FragmentParametersTable from './FragmentParametersTable.svelte';
  import TagsField from './TagsField.svelte';
  import TextArea from './TextArea.svelte';
  import VisibilityChoice from './VisibilityChoice.svelte';

  interface Props {
    nodes: PipelineNodeEntity[];
    replaceable: boolean;
    library: EditorLibrary;
    pipelineName: string;
    onSaved: (fragment: FragmentEntity, replace: boolean) => void;
    onCancel: () => void;
  }

  let { nodes, replaceable, library, pipelineName, onSaved, onCancel }: Props = $props();

  // svelte-ignore state_referenced_locally
  const draft = createSaveFragment({ nodes, replaceable, library, pipelineName, onSaved });
</script>

<form
  class="relative flex max-h-[70vh] flex-col gap-5 overflow-y-auto"
  novalidate
  onsubmit={event => {
    event.preventDefault();
    draft.save();
  }}
>
  <div class="grid gap-4 sm:grid-cols-2">
    <div class="flex flex-col gap-1.5">
      <Label for="fragment-name">{t(libraryMessages.name)}</Label>
      <Input
        id="fragment-name"
        bind:value={draft.name}
        class="font-mono"
        autocomplete="off"
        aria-invalid={!!draft.name && !!draft.nameIssue}
        aria-describedby="fragment-name-hint"
      />
      <p id="fragment-name-hint" class="text-xs text-muted-foreground">
        {#if draft.name && draft.nameIssue}
          <span class="text-destructive">
            {draft.nameIssue.kind === 'taken'
              ? t(libraryMessages.nameTaken)
              : nodeIdIssueText(draft.nameIssue)}
          </span>
        {:else if draft.name && !draft.existing}
          {t(libraryMessages.nameHint(draft.name.trim()))}
        {/if}
      </p>
    </div>
    <TagsField {draft} />
  </div>

  {#if draft.existing && !draft.nameIssue}
    <!-- The name of another fragment: saving changes it for each pipeline that links it. -->
    <label
      class="flex items-start gap-2.5 rounded-md border border-warning/40 bg-warning/10 px-3 py-2.5"
    >
      <Checkbox bind:checked={draft.confirmed} class="mt-0.5" />
      <span class="text-sm">
        <span class="block font-medium">
          {t(libraryMessages.newVersionOf(draft.existing.name, draft.versionNumber))}
        </span>
        <span class="text-muted-foreground">{t(libraryMessages.newVersionWarning)}</span>
      </span>
    </label>
  {/if}

  {#if draft.existing}
    <TextArea id="fragment-changes" label={t(libraryMessages.changes)} bind:value={draft.changes} />
  {:else}
    <TextArea
      id="fragment-description"
      label={t(libraryMessages.description)}
      bind:value={draft.description}
    />
  {/if}

  <FragmentParametersTable {draft} />
  <VisibilityChoice workspaceName={library.workspaceName} />

  <label class="flex items-center gap-2.5">
    <Checkbox bind:checked={draft.replace} disabled={!replaceable} />
    <span class="text-sm">
      <span class="block font-medium">{t(libraryMessages.replaceSelection)}</span>
      <span class="text-muted-foreground">
        {replaceable
          ? t(libraryMessages.replaceSelectionDetail(nodes.length, draft.name.trim() || '…'))
          : t(libraryMessages.replaceBlockedByPort)}
      </span>
    </span>
  </label>

  <div class="flex justify-end gap-2">
    <Button variant="outline" onclick={onCancel}>{t(libraryMessages.cancel)}</Button>
    <Button type="submit" disabled={!draft.canSave}>
      {t(
        draft.existing
          ? libraryMessages.publishVersion(draft.versionNumber)
          : libraryMessages.saveVersion(1),
      )}
    </Button>
  </div>
</form>
