<script lang="ts">
  import FolderIcon from '@lucide/svelte/icons/folder';
  import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
  import { ColorGlyph, ColorSwatches, swapIn, swapOut } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { recentColors } from '@base/features/project/presentation/recent-colors.user-state.ts';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';

  interface Props {
    /** The color of the folder. Unset: the default folder, in grey. */
    value: string | undefined;
    onchange: (color: string | undefined) => void;
    disabled?: boolean;
  }

  let { value, onchange, disabled = false }: Props = $props();

  const id = $props.id();
  const recent = recentColors();
</script>

<!-- The folder color in a form: the label, the preview, the colors and Reset. Nothing is saved. -->
<div data-part="group-color-field" role="group" aria-labelledby="{id}-label" class="flex flex-col gap-3">
  <span id="{id}-label" class="text-sm leading-snug font-medium">{t(projectMessages.folderColor)}</span>
  <div class="flex flex-wrap items-center gap-3">
    <span class="grid size-9 shrink-0 place-items-center rounded-lg border">
      {#key value ?? ''}
        <span class="col-start-1 row-start-1 flex" in:swapIn out:swapOut>
          <ColorGlyph icon={FolderIcon} color={value} class="size-5" />
        </span>
      {/key}
    </span>
    <ColorSwatches {value} onchange={color => onchange(color)} {recent} {disabled}>
      {#snippet preview(hex)}
        <span class="flex size-9 items-center justify-center rounded-lg border">
          <ColorGlyph icon={FolderIcon} color={hex} class="size-5" />
        </span>
      {/snippet}
    </ColorSwatches>
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled || !value}
      onclick={() => onchange(undefined)}
    >
      <RotateCcwIcon aria-hidden="true" />
      {t(projectMessages.resetColor)}
    </Button>
  </div>
</div>
