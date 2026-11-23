<script lang="ts">
  import { createQuery } from '@scylla/core-sdk';
  import { Button, Card, Input } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';
  import NodeInspector from '@base/features/pipeline/presentation/ui/editor/blueprint/side-panel/NodeInspector/NodeInspector.svelte';
  import { nodeTemplateQueries } from '@base/features/pipeline/presentation/pipeline.queries.ts';
  import { catalogEntries, catalogText } from '@base/features/pipeline/presentation/presenters/catalog.presenter.ts';
  import QuickAddMenu from '@base/features/pipeline/presentation/ui/editor/blueprint/catalog/QuickAddMenu/QuickAddMenu.svelte';
  import { createQuickAdd } from '@base/features/pipeline/presentation/ui/editor/blueprint/catalog/QuickAddMenu/quick-add.state.svelte.ts';
  import FragmentGraph from './FragmentGraph.svelte';
  import type { FragmentEdit } from './fragment-edit.state.svelte.ts';

  interface Props {
    nodes: PipelineNodeEntity[];
    /** The reader may change the nodes: the page of a fragment of the library. */
    edit?: FragmentEdit;
  }

  let { nodes: shownNodes, edit }: Props = $props();

  let viewedId = $state<string | null>(null);
  const nodes = $derived(edit?.nodes ?? shownNodes);
  const selectedId = $derived(edit ? (edit.selected?.id ?? null) : viewedId);
  const selected = $derived(nodes.find(node => node.id === selectedId));
  const select = (id: string | null) => (edit ? edit.select(id) : (viewedId = id));
  const editable = $derived(edit?.editable ?? false);

  // A link pulled onto empty canvas adds a node after it, with the menu of the editor.
  const templatesQuery = createQuery(() => ({
    ...nodeTemplateQueries.list(),
    enabled: editable,
  }));
  const quickAdd = createQuickAdd({
    entries: () => catalogEntries(templatesQuery.data ?? []),
    resolve: catalogText,
    onPick: (entry, request) => {
      if ('after' in request.link && request.link.after)
        edit?.add(entry.nodeId, entry.definition, { node: request.link.after, port: request.link.port });
    },
  });
</script>

<!-- The graph of the latest version, as the editor draws it. A click opens the node beside it. -->
<Card class="flex shrink-0 flex-col gap-0 overflow-hidden p-0">
  <div class="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3">
    <h2>{t(libraryMessages.overview)}</h2>
    <span class="text-xs text-muted-foreground">{t(libraryMessages.nodeCount(nodes.length))}</span>
    {#if edit?.dirty}
      <span class="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
        {t(pipelineMessages.statusDirty)}
      </span>
      <div class="ml-auto flex flex-wrap items-center gap-2">
        <Input
          class="h-8 w-56"
          placeholder={t(libraryMessages.whatChanged)}
          aria-label={t(libraryMessages.whatChanged)}
          bind:value={edit.changes}
        />
        <Button variant="ghost" size="sm" disabled={edit.publishing} onclick={() => edit.discard()}>
          {t(libraryMessages.discardChanges)}
        </Button>
        <Button size="sm" disabled={edit.publishing} onclick={() => edit.publish()}>
          {t(libraryMessages.publishVersion(edit.nextNumber))}
        </Button>
      </div>
    {:else}
      <span class="ml-auto text-xs text-muted-foreground">
        {t(editable ? libraryMessages.editNodeHint : libraryMessages.selectNodeHint)}
      </span>
    {/if}
  </div>
  <div class="flex h-[28rem]">
    <FragmentGraph
      {nodes}
      selectedId={selected?.id ?? null}
      onSelect={select}
      onPull={editable ? (after, client) => quickAdd.open({ client, flow: client, link: { after: after.node, port: after.port } }) : undefined}
    />
    {#if selected}
      <!-- The inspector needs the height of the editor's panel: below it, it scrolls. -->
      <aside class="w-[26rem] max-w-[55%] relative shrink-0 overflow-y-auto border-l bg-card">
        <div class="h-full min-h-[38rem]">
          {#key selected.id}
            <NodeInspector
              node={selected}
              dependencies={selected.deps}
              detached={false}
              readOnly={!editable}
              onChange={value => edit?.update(selected.id, value)}
              onRename={id => edit?.rename(selected.id, id) ?? selected.id}
              onDelete={() => edit?.remove(selected.id)}
              onClose={() => select(null)}
            />
          {/key}
        </div>
      </aside>
    {/if}
  </div>
</Card>
<QuickAddMenu {quickAdd} />
