<script lang="ts">
  import UploadIcon from '@lucide/svelte/icons/upload';
  import type { MessageDescriptor } from '@lingui/core';
  import { t } from '../../i18n/index.ts';
  import { Button } from '../../primitives/index.ts';
  import { cn } from '../../utils/index.ts';
  import { IMAGE_TYPES, imageFileProblem } from './icon-picker.ts';
  import { iconPickerMessages as m } from './icon-picker.messages.ts';

  interface Props {
    /** A file that the server accepts. */
    onfile: (file: File) => void;
  }

  let { onfile }: Props = $props();

  let input = $state<HTMLInputElement | null>(null);
  let over = $state(false);
  let problem = $state<MessageDescriptor | undefined>();

  const take = (file: File | undefined) => {
    if (!file) return;
    problem = imageFileProblem(file);
    if (!problem) onfile(file);
  };

  const drop = (event: DragEvent) => {
    event.preventDefault();
    over = false;
    take(event.dataTransfer?.files[0]);
  };
</script>

<div
  role="group"
  aria-label={t(m.imageTab)}
  data-over={over ? '' : undefined}
  class={cn(
    'flex h-[158px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-7 text-center transition-colors',
    over && 'border-primary bg-primary/8',
    problem && !over && 'border-destructive',
  )}
  ondragenter={event => {
    event.preventDefault();
    over = true;
  }}
  ondragover={event => event.preventDefault()}
  ondragleave={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) over = false;
  }}
  ondrop={drop}
>
  <span class="bg-muted flex size-10 shrink-0 items-center justify-center rounded-full">
    <UploadIcon class="size-5" aria-hidden="true" />
  </span>
  <p class="flex flex-wrap items-center justify-center gap-1 text-sm font-medium">
    <span>{t(m.dropHere)}</span>
    <Button variant="link" size="sm" class="h-auto p-0" onclick={() => input?.click()}>
      {t(m.browse)}
    </Button>
  </p>
  {#if problem}
    <p role="alert" class="text-destructive text-xs">{t(problem)}</p>
  {:else}
    <p class="text-muted-foreground text-xs">{t(m.imageRules)}</p>
  {/if}
  <input
    bind:this={input}
    type="file"
    accept={IMAGE_TYPES.join(',')}
    class="hidden"
    onchange={event => {
      take(event.currentTarget.files?.[0]);
      event.currentTarget.value = '';
    }}
  />
</div>
