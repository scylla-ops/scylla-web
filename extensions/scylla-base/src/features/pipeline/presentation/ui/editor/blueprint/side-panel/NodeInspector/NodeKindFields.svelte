<script lang="ts">
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { NodeDraft } from '@base/features/pipeline/presentation/ui/editor/node/node-draft.state.svelte.ts';
  import { blueprintMessages } from '@base/features/pipeline/presentation/messages/blueprint.messages.ts';
  import { nodeMessages } from '@base/features/pipeline/presentation/messages/node.messages.ts';
  import NodeCodeTab from './NodeCodeTab.svelte';
  import NodeEnvFields from '@base/features/pipeline/presentation/ui/editor/node/NodeEnvFields.svelte';
  import NodeErrorOutputField from '@base/features/pipeline/presentation/ui/editor/node/NodeErrorOutputField.svelte';
  import NodeSwitchFields from '@base/features/pipeline/presentation/ui/editor/node/NodeSwitchFields/NodeSwitchFields.svelte';

  interface Props {
    draft: NodeDraft;
    /** Scopes the secret picker. */
    projectId?: string;
    errorOutput: boolean;
    onErrorOutputChange: (on: boolean) => void;
    outputNodes: string[];
  }

  let { draft, projectId, errorOutput, onErrorOutputChange, outputNodes }: Props = $props();

  const envCount = $derived(draft.envRows.filter(row => row.key.trim()).length);
</script>

<!--
  The fields of the kind of the node: the code and the environment of a node that runs a step, in
  two tabs; the cases and the environment of a switch, in one column; nothing for a merge.
-->
{#if draft.mode === 'switch'}
  <div class="relative mt-2 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
    <NodeSwitchFields {draft} {outputNodes} />
    <div class="-mx-4 flex flex-col">
      <span class="px-4 text-sm font-medium">{t(nodeMessages.environment)}</span>
      <NodeEnvFields {draft} {projectId} />
    </div>
  </div>
{:else if draft.mode === 'merge'}
  <p class="mt-2 flex-1 px-4 py-3 text-sm text-muted-foreground">{t(nodeMessages.mergeHint)}</p>
{:else}
  <Tabs value="code" class="mt-2 flex min-h-0 flex-1 flex-col gap-0">
    <TabsList class="mx-4 self-start">
      <TabsTrigger value="code">{t(blueprintMessages.code)}</TabsTrigger>
      <TabsTrigger value="environment">
        {t(nodeMessages.environment)}
        {#if envCount}
          <span class="ml-1 rounded-full bg-muted px-1.5 text-[11px]">{envCount}</span>
        {/if}
      </TabsTrigger>
    </TabsList>
    <TabsContent value="code" class="flex min-h-0 flex-1 flex-col">
      <NodeCodeTab {draft} />
      <div class="px-4 pb-4">
        <NodeErrorOutputField checked={errorOutput} onCheckedChange={onErrorOutputChange} />
      </div>
    </TabsContent>
    <TabsContent value="environment" class="relative min-h-0 flex-1 overflow-y-auto">
      <NodeEnvFields {draft} {projectId} />
    </TabsContent>
  </Tabs>
{/if}
