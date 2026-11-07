<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import UnplugIcon from '@lucide/svelte/icons/unplug';
  import XIcon from '@lucide/svelte/icons/x';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type {
    Dependency,
    NodeIssue,
    PipelineNodeEntity,
    NodeDefinition,
  } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
  import { ERROR_PORT } from '@base/features/pipeline/domain/structs/port-name.struct.ts';
  import { createNodeDraft } from '@base/features/pipeline/presentation/ui/editor/node/node-draft.state.svelte.ts';
  import type { PortChange } from '@base/features/pipeline/presentation/ui/editor/node/switch-draft.state.svelte.ts';
  import { dependencyText } from '@base/features/pipeline/presentation/mappers/pipeline-document.mapper.ts';
  import { blueprintMessages } from '@base/features/pipeline/presentation/messages/blueprint.messages.ts';
  import { nodeMessages } from '@base/features/pipeline/presentation/messages/node.messages.ts';
  import {
    NODE_ISSUE_MESSAGES,
    nodeIssueText,
  } from '@base/features/pipeline/presentation/presenters/node-issue.presenter.ts';
  import {
    KIND_TONES,
    nodeIcon,
  } from '@base/features/pipeline/presentation/presenters/node-kind.presenter.ts';
  import NodeKindFields from './NodeKindFields.svelte';
  import NodeIdField from '@base/features/pipeline/presentation/ui/editor/node/NodeIdField.svelte';

  interface Props {
    /** Read once: the panel rebuilds the draft for each node. */
    node: PipelineNodeEntity;
    dependencies: Dependency[];
    /** No edge goes into the node: saving links it to the start node. */
    detached: boolean;
    /** What the pipeline refuses in the node; the field of the id says its own issue. */
    issue?: NodeIssue | null;
    /** The node shows its error output. */
    errorOutput?: boolean;
    /** The nodes whose outputs a switch can read. */
    outputNodes?: string[];
    /** The icon hint of the template whose code the node runs, if any. */
    iconHintOf?: (definition: NodeDefinition) => string | undefined;
    /** Scopes the secret picker. */
    projectId?: string;
    onChange: (value: NodeDefinition, port?: PortChange) => void;
    /** Returns the id the node really got. */
    onRename: (id: string) => string;
    onErrorOutputChange?: (on: boolean) => void;
    onDelete: () => void;
    onClose: () => void;
  }

  let {
    node,
    dependencies,
    detached,
    issue = null,
    errorOutput = false,
    outputNodes = [],
    iconHintOf,
    projectId,
    onChange,
    onRename,
    onErrorOutputChange = () => {},
    onDelete,
    onClose,
  }: Props = $props();

  // svelte-ignore state_referenced_locally
  const draft = createNodeDraft({
    node,
    onChange: (...change) => onChange(...change),
    onRename: id => onRename(id),
  });

  const Icon = $derived(nodeIcon(draft.mode, iconHintOf?.(draft.value)));
  const tone = $derived(KIND_TONES[draft.mode]);
  // A command or a script says its issue as it is typed; the pipeline says the others.
  const alert = $derived(
    draft.issue
      ? t(NODE_ISSUE_MESSAGES[draft.issue])
      : issue && issue.kind !== 'id' && issue.kind !== 'run'
        ? nodeIssueText(issue)
        : null,
  );
</script>

<div class="flex h-full flex-col">
  <div class="flex flex-col gap-2.5 px-4 pt-3.5">
    <div class="flex items-start gap-2.5">
      <span
        class={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', tone.tile, tone.text)}
      >
        <Icon class="size-4" />
      </span>
      <NodeIdField {draft} />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t(blueprintMessages.closePanel)}
        onclick={onClose}
      >
        <XIcon class="size-4" />
      </Button>
    </div>

    <div class="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      {#if detached}
        <span
          class="flex items-start gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-foreground"
        >
          <UnplugIcon class="mt-px size-3.5 shrink-0 text-warning" />
          {t(blueprintMessages.detachedHint)}
        </span>
      {:else if dependencies.length === 0}
        <span>{t(nodeMessages.runsFirst)}</span>
      {:else}
        <span>{t(blueprintMessages.after)}</span>
        {#each dependencies as dependency (dependencyText(dependency))}
          <span
            class={cn(
              'rounded-md border bg-accent px-1.5 py-0.5 font-mono text-[11.5px] text-foreground',
              dependency.port === ERROR_PORT && 'border-destructive/40 text-destructive',
            )}
          >
            {dependencyText(dependency)}
          </span>
        {/each}
      {/if}
    </div>
  </div>

  <NodeKindFields {draft} {projectId} {errorOutput} {onErrorOutputChange} {outputNodes} />

  {#if alert}
    <p
      role="alert"
      class="mx-4 mb-2 flex items-center gap-2 rounded-md bg-destructive-subtle px-3 py-2 text-sm text-destructive"
    >
      <CircleAlertIcon class="size-4 shrink-0" />
      {alert}
    </p>
  {/if}

  <div class="flex items-center gap-2 border-t px-4 py-3">
    <Button
      variant="ghost"
      size="sm"
      class="-ml-2 text-destructive hover:text-destructive"
      onclick={onDelete}
    >
      <Trash2Icon class="size-4" />
      {t(nodeMessages.deleteNode)}
    </Button>
    <span class="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
      <CheckIcon class="size-3.5 text-primary" />
      {t(blueprintMessages.appliedToDraft)}
    </span>
    <Button variant="outline" size="sm" onclick={onClose}>
      {t(blueprintMessages.close)}
    </Button>
  </div>
</div>
