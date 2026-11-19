<script lang="ts">
  import { Select, SelectContent, SelectItem, SelectTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import type { BlockInspector } from './block-inspector.state.svelte.ts';

  interface Props {
    inspector: BlockInspector;
  }

  let { inspector }: Props = $props();

  const current = $derived(
    t(
      inspector.isLatest
        ? libraryMessages.latestVersion(inspector.link.version)
        : libraryMessages.pinnedVersion(inspector.link.version),
    ),
  );
</script>

<!-- The version the block links. Another one is taken at once, with the values kept. -->
<section class="flex flex-col gap-2 px-4">
  <h3 id="block-version" class="text-[11px] tracking-wider text-muted-foreground uppercase">
    {t(libraryMessages.versionLabel)}
  </h3>
  <div class="flex items-center gap-2">
    <Select
      type="single"
      value={String(inspector.link.version)}
      onValueChange={value => inspector.switchTo(Number(value))}
    >
      <SelectTrigger aria-labelledby="block-version" class="flex-1">
        {current}
      </SelectTrigger>
      <SelectContent>
        {#each inspector.versions as version (version.number)}
          <SelectItem value={String(version.number)} label={t(libraryMessages.version(version.number))}>
            {t(libraryMessages.version(version.number))}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
    <span class="shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium">
      {inspector.behind ? t(libraryMessages.behind(inspector.behind)) : t(libraryMessages.upToDate)}
    </span>
  </div>
</section>
