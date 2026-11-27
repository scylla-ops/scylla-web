<script lang="ts">
  import FolderIcon from '@lucide/svelte/icons/folder';
  import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
  import { ColorGlyph, ColorSwatches, swapIn, swapOut } from '@scylla/ui';
  import { Button, Popover, PopoverContent, PopoverTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { recentColors } from '@base/features/project/presentation/recent-colors.user-state.ts';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';

  interface Props {
    /** The color of the folder. Unset: the default folder, in grey. */
    value: string | undefined;
    /** Each change, live. Unset: back to the default folder. */
    onchange: (color: string | undefined) => void;
    /** The popover closes: the owner saves the last color. */
    onclose?: () => void;
    /** The accessible name of the button. */
    label: string;
    disabled?: boolean;
    /** The colors show. The menu of the group opens them. */
    open?: boolean;
    class?: string;
  }

  let {
    value,
    onchange,
    onclose,
    label,
    disabled = false,
    open = $bindable(false),
    class: className,
  }: Props = $props();

  const id = $props.id();
  let content = $state<HTMLElement | null>(null);
  const recent = recentColors();

  const openChange = (next: boolean) => {
    open = next;
    if (!next) onclose?.();
  };

  // A click out of the colors, e.g. on the name field, keeps its focus there: the focus goes back
  // to the folder only after Escape or Tab.
  let clickedOut = false;
  const keepFocusOfClick = (event: Event) => {
    if (clickedOut) event.preventDefault();
    clickedOut = false;
  };
</script>

<!-- The folder of a group: a click opens its colors. A new color grows in over the old one. -->
<Popover {open} onOpenChange={openChange}>
  <PopoverTrigger
    aria-label={label}
    title={label}
    {disabled}
    data-part="group-color-button"
    class={cn(
      'focus-visible:ring-ring/50 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md outline-none transition-colors duration-150 hover:bg-accent focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none data-[state=open]:bg-accent',
      className,
    )}
  >
    <span class="grid place-items-center">
      {#key value ?? ''}
        <span class="col-start-1 row-start-1 flex" in:swapIn out:swapOut>
          <ColorGlyph icon={FolderIcon} color={value} />
        </span>
      {/key}
    </span>
  </PopoverTrigger>
  <PopoverContent
    align="start"
    class="w-auto p-3"
    onInteractOutside={() => (clickedOut = true)}
    onCloseAutoFocus={keepFocusOfClick}
  >
    <div bind:this={content} class="flex flex-col gap-2">
      <div class="flex h-8 items-center justify-between gap-3">
        <span id="{id}-label" class="text-xs font-medium text-muted-foreground">
          {t(projectMessages.folderColor)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!value}
          onclick={() => onchange(undefined)}
        >
          <RotateCcwIcon aria-hidden="true" />
          {t(projectMessages.resetColor)}
        </Button>
      </div>
      <ColorSwatches
        {value}
        onchange={color => onchange(color)}
        {recent}
        anchor={content}
        side="right"
        sideOffset={12}
        labelledby="{id}-label"
      >
        {#snippet preview(hex)}
          <span class="flex size-9 items-center justify-center rounded-lg border">
            <ColorGlyph icon={FolderIcon} color={hex} class="size-5" />
          </span>
        {/snippet}
      </ColorSwatches>
    </div>
  </PopoverContent>
</Popover>
