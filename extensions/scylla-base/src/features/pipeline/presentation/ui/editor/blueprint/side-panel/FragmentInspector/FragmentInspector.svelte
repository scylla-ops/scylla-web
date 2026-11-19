<script lang="ts">
  import LibraryBigIcon from '@lucide/svelte/icons/library-big';
  import XIcon from '@lucide/svelte/icons/x';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { scyllaNavigate } from '@platform/context';
  import type { FragmentEntity } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import type { FragmentFlowNodeData } from '@base/features/pipeline/presentation/mappers/blueprint-flow.mapper.ts';
  import { blueprintMessages } from '@base/features/pipeline/presentation/messages/blueprint.messages.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import FragmentIcon from '../../catalog/FragmentIcon.svelte';
  import type { BlockContent } from '../../blueprint.state.svelte.ts';
  import { createBlockInspector } from './block-inspector.state.svelte.ts';
  import BlockParameterField from './BlockParameterField.svelte';
  import BlockUpdateCard from './BlockUpdateCard.svelte';
  import BlockVersionPicker from './BlockVersionPicker.svelte';
  import VersionHistory from '@base/features/pipeline/presentation/ui/library/VersionHistory.svelte';

  interface Props {
    blockId: string;
    block: FragmentFlowNodeData;
    fragment: FragmentEntity | undefined;
    workspaceName: string;
    /** Scopes the secret picker. */
    projectId?: string;
    onChange: (content: BlockContent, skippedVersion?: number) => void;
    onDetach: () => void;
    onClose: () => void;
  }

  let { blockId, block, fragment, workspaceName, projectId, onChange, onDetach, onClose }: Props =
    $props();

  const inspector = createBlockInspector({
    block: () => block,
    fragment: () => fragment,
    onChange: (content, skipped) => onChange(content, skipped),
  });
</script>

<div class="flex h-full flex-col">
  <header class="flex items-start gap-2.5 border-b px-4 py-3.5">
    <FragmentIcon />
    <div class="min-w-0 flex-1">
      <h2 class="truncate text-sm">{blockId}</h2>
      <p class="text-xs text-muted-foreground">
        {t(libraryMessages.linkedFragment)} · {t(libraryMessages.workspaceLibrary(workspaceName))}
      </p>
    </div>
    <Button variant="ghost" size="icon-sm" aria-label={t(blueprintMessages.closePanel)} onclick={onClose}>
      <XIcon class="size-4" />
    </Button>
  </header>

  <div class="relative flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-4">
    {#if !inspector.fragment}
      <p class="px-4 text-sm text-muted-foreground">{t(libraryMessages.unknownFragment)}</p>
    {:else}
      <BlockVersionPicker {inspector} />

      {#if inspector.proposed}
        <BlockUpdateCard
          proposed={inspector.proposed}
          current={inspector.link.version}
          onSwitch={() => inspector.switchTo(inspector.proposed!.number)}
          onStay={() => inspector.stay()}
        />
      {/if}

      {#if inspector.version?.parameters.length}
        <section class="flex flex-col gap-3 border-t px-4 pt-4">
          <h3 class="text-[11px] tracking-wider text-muted-foreground uppercase">
            {t(libraryMessages.parameters)}
          </h3>
          {#each inspector.version.parameters as parameter (parameter.key)}
            <BlockParameterField
              {parameter}
              value={inspector.link.values[parameter.key] ?? ''}
              {projectId}
              onChange={value => inspector.setValue(parameter.key, value)}
            />
          {/each}
        </section>
      {/if}

      <section class="flex flex-col gap-2 border-t px-4 pt-4">
        <h3 class="text-[11px] tracking-wider text-muted-foreground uppercase">
          {t(libraryMessages.actions)}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onclick={() => scyllaNavigate.goToWorkspaceRoute(`library/${inspector.link.fragmentId}`)}
        >
          <LibraryBigIcon class="size-4" />
          {t(libraryMessages.openInLibrary)}
        </Button>
        <Button variant="ghost-destructive" size="sm" onclick={onDetach}>
          {t(libraryMessages.detach)}
        </Button>
        <p class="text-xs text-muted-foreground">{t(libraryMessages.detachHint)}</p>
      </section>

      <section class="border-t px-4 pt-4">
        <h3 class="pb-2 text-[11px] tracking-wider text-muted-foreground uppercase">
          {t(libraryMessages.history)}
        </h3>
        <VersionHistory versions={inspector.versions} current={inspector.link.version} compact />
      </section>
    {/if}
  </div>
</div>
