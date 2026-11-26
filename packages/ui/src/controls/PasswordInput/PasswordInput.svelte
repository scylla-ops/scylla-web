<script lang="ts">
  import EyeIcon from '@lucide/svelte/icons/eye';
  import EyeOffIcon from '@lucide/svelte/icons/eye-off';
  import type { HTMLInputAttributes } from 'svelte/elements';
  import { Input } from '../../primitives/index.ts';
  import { t } from '../../i18n/lingui.adapter.svelte.ts';
  import { cn } from '../../utils/index.ts';
  import { passwordInputMessages as messages } from './password-input.messages.ts';

  type Props = Omit<HTMLInputAttributes, 'type'> & { value?: string | number | null };

  let { class: className, value = $bindable(), disabled, ...rest }: Props = $props();

  let visible = $state(false);

  /** The text goes back to hidden when the form around the field is submitted. */
  const hideOnSubmit = (element: HTMLElement) => {
    const form = element.closest('form');
    const hide = () => (visible = false);
    form?.addEventListener('submit', hide);
    return () => form?.removeEventListener('submit', hide);
  };
</script>

<div class="relative w-full" {@attach hideOnSubmit}>
  <Input
    {...rest}
    type={visible ? 'text' : 'password'}
    bind:value
    {disabled}
    class={cn('pr-10', className)}
  />
  <!-- `type="button"`: Enter on it submits nothing. -->
  <button
    type="button"
    {disabled}
    aria-label={t(visible ? messages.hide : messages.show)}
    aria-pressed={visible}
    onclick={() => (visible = !visible)}
    class="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center rounded-r-lg text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
  >
    {#if visible}
      <EyeOffIcon class="h-4 w-4" />
    {:else}
      <EyeIcon class="h-4 w-4" />
    {/if}
  </button>
</div>
