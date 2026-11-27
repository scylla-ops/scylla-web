<script lang="ts">
  import { tick } from 'svelte';
  import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical';
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
  const keepFocus = async (button: HTMLElement) => {
    await tick();
    button.focus();
  };

  /** Space lifts and drops, the arrow keys move, Escape cancels. */
  const onkeydown = (event: KeyboardEvent & { currentTarget: HTMLButtonElement }) => {
    const button = event.currentTarget;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (lifted) groups.place();
      else groups.lift(id, name);
      return;
    }
    if (!lifted) return;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      groups.step(event.key === 'ArrowUp' ? -1 : 1);
      void keepFocus(button);
    } else if (event.key === 'Escape') {
      // The reorder mode stays: Escape cancels the move of the group only.
      event.preventDefault();
      event.stopPropagation();
      groups.restore();
      void keepFocus(button);
    }
  };

  // The focus leaves the handle (a click away, Tab): the group stays where it is.
  const onfocusout = (event: FocusEvent & { currentTarget: HTMLButtonElement }) => {
    const button = event.currentTarget;
    setTimeout(() => {
      if (lifted && document.activeElement !== button) groups.place();
    });
  };
</script>

<!-- The handle of a group in the reorder mode, in the place of the "+" of the header: a pointer
     drags the header, the keyboard moves it. -->
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
  {onkeydown}
  {onfocusout}
>
  <GripVerticalIcon class="size-4" aria-hidden="true" />
</button>
