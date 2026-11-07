<script lang="ts">
  import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import {
    runsStep,
    type PipelineNodeEntity,
  } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
  import type { PipelineScripting } from '../pipeline-scripting.state.svelte.ts';
  import { scriptingMessages } from '@base/features/pipeline/presentation/messages/scripting.messages.ts';
  import { nodeMessages } from '@base/features/pipeline/presentation/messages/node.messages.ts';
  import {
    NODE_ISSUE_MESSAGES,
    nodeIssueText,
  } from '@base/features/pipeline/presentation/presenters/node-issue.presenter.ts';
  import {
    KIND_TONES,
    nodeIcon,
  } from '@base/features/pipeline/presentation/presenters/node-kind.presenter.ts';
  import NodeEnvFields from '@base/features/pipeline/presentation/ui/editor/node/NodeEnvFields.svelte';
  import NodeErrorOutputField from '@base/features/pipeline/presentation/ui/editor/node/NodeErrorOutputField.svelte';
  import NodeIdField from '@base/features/pipeline/presentation/ui/editor/node/NodeIdField.svelte';
  import NodeKindPicker from '@base/features/pipeline/presentation/ui/editor/node/NodeKindPicker.svelte';
  import NodeTimeoutRetriesFields from '@base/features/pipeline/presentation/ui/editor/node/NodeTimeoutRetriesFields.svelte';
  import NodeWorkingDirField from '@base/features/pipeline/presentation/ui/editor/node/NodeWorkingDirField.svelte';
  import NodeDependencies from './NodeDependencies.svelte';

  interface Props {
    scripting: PipelineScripting;
    node: PipelineNodeEntity;
    /** Scopes the secret picker. */
    projectId?: string;
  }

  let { scripting, node, projectId }: Props = $props();

  // The same draft as the pane's editor: an edit here and one there do not undo each other.
  const draft = $derived(scripting.draftOf(node));
  const Icon = $derived(nodeIcon(draft.mode));
  const tone = $derived(KIND_TONES[draft.mode]);
  const issue = $derived(scripting.issueOf(node.id));
  // A command or a script says its issue as it is typed; the pipeline says the others.
  const alert = $derived(
    draft.issue
      ? t(NODE_ISSUE_MESSAGES[draft.issue])
      : issue && issue.kind !== 'id' && issue.kind !== 'run'
        ? nodeIssueText(issue)
        : null,
  );
</script>

<aside aria-label={t(scriptingMessages.nodeProperties)} class="flex h-full flex-col border-l bg-card">
  <div class="relative flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
    <div class="flex items-start gap-2.5">
      <span class={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', tone.tile, tone.text)}>
        <Icon class="size-4" />
      </span>
      <NodeIdField {draft} />
    </div>

    <!-- A switch and a merge stay what they are, and have none of the fields of a step. -->
    {#if runsStep(node)}
      <NodeKindPicker {draft} />
      <NodeWorkingDirField {draft} />
      <NodeTimeoutRetriesFields {draft} />
      <NodeErrorOutputField
        checked={scripting.hasErrorOutput(node.id)}
        onCheckedChange={on => scripting.setErrorOutput(node.id, on)}
      />
    {/if}

    <NodeDependencies
      deps={node.deps}
      candidates={scripting.dependencyCandidates(node.id)}
      dependents={scripting.dependentsOf(node.id)}
      onChange={deps => scripting.setDependencies(node.id, deps)}
      onOpen={id => scripting.panes.open(id)}
    />

    {#if node.kind !== 'merge'}
      <div class="-mx-4 flex flex-col">
        <span class="px-4 text-sm font-medium">{t(nodeMessages.environment)}</span>
        <NodeEnvFields {draft} {projectId} />
      </div>
    {/if}
  </div>

  {#if alert}
    <p
      role="alert"
      class="mx-4 mb-2 flex items-center gap-2 rounded-md bg-destructive-subtle px-3 py-2 text-sm text-destructive"
    >
      <CircleAlertIcon class="size-4 shrink-0" />
      {alert}
    </p>
  {/if}

  <div class="border-t px-4 py-3">
    <Button
      variant="ghost"
      size="sm"
      class="-ml-2 text-destructive hover:text-destructive"
      onclick={() => scripting.remove(node.id)}
    >
      <Trash2Icon class="size-4" />
      {t(nodeMessages.deleteNode)}
    </Button>
  </div>
</aside>
