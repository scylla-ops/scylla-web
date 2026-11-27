<script lang="ts">
  import { tick } from 'svelte';
  import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical';
  import { dragWithKeys } from '@scylla/ui/dnd';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import type { GroupReorderState } from '../group-reorder.state.svelte.ts';

  interface Props {
    id: string;
    name: string;
    groups: GroupReorderState;
    /** The id of the text that tells the keys. */
    hintId: string;
  }

  let { id, name, groups, hintId }: Props = $props();

  const lifted = $derived(groups.drag?.id === id && groups.drag.keyboard);

  // The section moves in the page: the focus stays on its handle.
  const keepFocus = async () => {
    await tick();
    document.querySelector<HTMLElement>(`[data-part="group-grip"][data-group="${id}"]`)?.focus();
  };
</script>

<!-- The handle of a group in the reorder mode, in the place of the "+" of the header: a pointer
     drags the header, the keyboard moves it (`dragWithKeys`). -->
<button
  type="button"
  class={cn(
    'flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground transition-colors outline-none select-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 active:cursor-grabbing max-md:size-11 motion-reduce:transition-none pointer-coarse:size-11',
    lifted && 'bg-primary/10 text-primary',
  )}
  aria-label={t(projectMessages.moveGroup(name))}
  aria-describedby={hintId}
  aria-pressed={lifted}
  data-part="group-grip"
  data-group={id}
  {@attach dragWithKeys(() => ({
    lifted: () => groups.drag?.id === id && !!groups.drag.keyboard,
    pick: () => groups.lift(id, name),
    step: delta => {
      groups.step(delta);
      void keepFocus();
    },
    drop: () => groups.place(),
    cancel: () => {
      groups.restore();
      void keepFocus();
    },
  }))}
>
  <GripVerticalIcon class="size-4" aria-hidden="true" />
</button>
