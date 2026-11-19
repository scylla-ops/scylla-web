<script lang="ts">
  import { Switch } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import ParameterKey from '@base/features/pipeline/presentation/ui/library/ParameterKey.svelte';
  import type { SaveFragment } from './save-fragment.state.svelte.ts';

  interface Props {
    draft: SaveFragment;
  }

  let { draft }: Props = $props();
</script>

<!-- The variables of the nodes: an exposed one is a parameter, filled by each pipeline. -->
<section class="flex flex-col gap-1.5">
  <h3 class="text-sm">{t(libraryMessages.parameters)}</h3>
  {#if draft.detected.length}
    <div class="overflow-hidden rounded-lg border">
      <div class="grid grid-cols-[1fr_1fr_auto] gap-3 bg-muted px-3 py-2 text-xs text-muted-foreground">
        <span>{t(libraryMessages.parameter)}</span>
        <span>{t(libraryMessages.defaultValue)}</span>
        <span>{t(libraryMessages.exposed)}</span>
      </div>
      {#each draft.detected as parameter (parameter.key)}
        <div class="grid grid-cols-[1fr_1fr_auto] items-center gap-3 border-t px-3 py-2 text-xs">
          <ParameterKey {parameter} />
          <span class="truncate font-mono text-muted-foreground">
            {parameter.kind === 'secret' ? t(libraryMessages.secretRequired) : parameter.default}
          </span>
          <!-- A secret is always exposed: the fragment never holds its value. -->
          <Switch
            checked={draft.isExposed(parameter.key)}
            disabled={parameter.kind === 'secret'}
            onCheckedChange={checked => draft.setExposed(parameter.key, checked)}
            aria-label={t(libraryMessages.exposeParameter(parameter.key))}
          />
        </div>
      {/each}
    </div>
    <p class="text-xs text-muted-foreground">{t(libraryMessages.exposedHint)}</p>
  {:else}
    <p class="text-xs text-muted-foreground">{t(libraryMessages.noParameter)}</p>
  {/if}
</section>
