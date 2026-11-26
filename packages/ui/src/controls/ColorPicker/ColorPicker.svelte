<script lang="ts">
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import PipetteIcon from '@lucide/svelte/icons/pipette';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import type { Snippet } from 'svelte';
  import { t } from '../../i18n/index.ts';
  import { Input } from '../../primitives/index.ts';
  import { cn } from '../../utils/index.ts';
  import IconButton from '../IconButton/IconButton.svelte';
  import { trackPointer } from './color-picker.attachments.ts';
  import { colorPickerMessages as m } from './color-picker.messages.ts';
  import { createColorPicker } from './color-picker.state.svelte.ts';
  import { contrastLines, hasEyeDropper, pickScreenColor } from './color-picker.ts';

  interface Props {
    /** The color when the picker opens, `#RRGGBB`. */
    value: string;
    /** Each change of the color, `#RRGGBB` in upper case. */
    onchange: (hex: string) => void;
    /** The recent colors, the most recent first. */
    recent?: readonly string[];
    /** The live preview of the color. Default: a tile of the color. */
    preview?: Snippet<[string]>;
    /** Shows the contrast of the color with the card of each theme. */
    contrast?: boolean;
    class?: string;
  }

  let { value, onchange, recent = [], preview, contrast = true, class: className }: Props = $props();

  // svelte-ignore state_referenced_locally
  const picker = createColorPicker(value, onchange);
  const lines = $derived(contrast ? contrastLines(picker.hex) : []);
  const keys: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  };

  const onAreaKey = (event: KeyboardEvent) => {
    const step = keys[event.key];
    if (!step) return;
    event.preventDefault();
    picker.nudge(...step);
  };

  const pickOnScreen = async () => {
    const color = await pickScreenColor();
    if (color) picker.pick(color);
  };
</script>

<div data-slot="color-picker" class={cn('flex w-60 flex-col gap-3', className)}>
  <div
    role="slider"
    tabindex="0"
    aria-label={t(m.area)}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(picker.hsv.s * 100)}
    aria-valuetext={picker.hex}
    class="focus-visible:ring-ring/50 relative h-37 w-full cursor-crosshair touch-none rounded-md outline-none focus-visible:ring-[3px]"
    style:background="linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), {picker.hueColor}"
    onkeydown={onAreaKey}
    {@attach trackPointer((x, y) => picker.setPoint(x, y))}
  >
    <span
      class="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#fff] shadow-sm"
      style:left="{picker.hsv.s * 100}%"
      style:top="{(1 - picker.hsv.v) * 100}%"
      style:background={picker.hex}
    ></span>
  </div>

  <input
    type="range"
    min="0"
    max="360"
    step="1"
    aria-label={t(m.hue)}
    value={picker.hsv.h}
    oninput={event => picker.setHue(Number(event.currentTarget.value))}
    class="focus-visible:ring-ring/50 h-3 w-full cursor-pointer appearance-none rounded-full outline-none focus-visible:ring-[3px] [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-border [&::-moz-range-thumb]:bg-[#fff] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-border [&::-webkit-slider-thumb]:bg-[#fff]"
    style:background="linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)"
  />

  <div class="flex items-center gap-2">
    {#if preview}
      {@render preview(picker.hex)}
    {:else}
      <span class="size-9 shrink-0 rounded-lg border" style:background={picker.hex}></span>
    {/if}
    <div class="relative w-[154px]">
      <span
        class="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm"
        aria-hidden="true">#</span
      >
      <Input
        aria-label={t(m.hex)}
        value={picker.text}
        maxlength={7}
        spellcheck={false}
        autocomplete="off"
        class="pl-6 font-mono uppercase"
        oninput={event => picker.type(event.currentTarget.value)}
        onblur={() => picker.commitText()}
      />
    </div>
    {#if hasEyeDropper()}
      <IconButton icon={PipetteIcon} tooltip={t(m.eyedropper)} onclick={pickOnScreen} />
    {/if}
  </div>

  {#if recent.length > 0}
    <div class="flex flex-col gap-1.5">
      <span class="text-muted-foreground text-xs font-medium">{t(m.recent)}</span>
      <div class="flex flex-wrap items-center gap-1.5">
        {#each recent as color (color)}
          <button
            type="button"
            aria-label={t(m.recentColor(color))}
            aria-pressed={color.toUpperCase() === picker.hex}
            class="ring-offset-popover aria-pressed:ring-foreground focus-visible:ring-ring size-5 shrink-0 cursor-pointer rounded-full border ring-offset-2 outline-none aria-pressed:ring-2 focus-visible:ring-2"
            style:background={color}
            onclick={() => picker.pick(color)}
          ></button>
        {/each}
      </div>
    </div>
  {/if}

  {#if lines.length > 0}
    <ul class="flex flex-col gap-1" aria-live="polite">
      {#each lines as line (line.theme)}
        <li class="text-muted-foreground flex items-center gap-1.5 text-xs">
          {#if line.ok}
            <CircleCheckIcon class="text-success size-3.5 shrink-0" aria-hidden="true" />
          {:else}
            <TriangleAlertIcon class="text-warning size-3.5 shrink-0" aria-hidden="true" />
          {/if}
          <span>{t(line.message)}</span>
        </li>
      {/each}
    </ul>
  {/if}
</div>
