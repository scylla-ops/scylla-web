<script lang="ts">
  import { Button, Checkbox, Dialog, DialogContent, DialogTitle, Input, Label } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { editorMessages as messages } from '@base/features/dashboard/presentation/messages/editor.messages.ts';
  import type { DashboardStart } from '@base/features/dashboard/presentation/ui/dashboards.state.svelte.ts';

  interface Props {
    /** The open dashboard: "Current dashboard" copies it. */
    current: { id: string; name: string } | null;
    onCreate: (name: string, start: DashboardStart, makeDefault: boolean) => void;
    onClose: () => void;
  }

  let { current, onCreate, onClose }: Props = $props();

  type Choice = 'calm' | 'current' | 'bento' | 'blank';

  let name = $state('');
  let choice = $state<Choice>('calm');
  let makeDefault = $state(false);

  const CHOICES = $derived([
    { id: 'calm' as const, title: t(messages.calm), hint: t(messages.calmHint) },
    ...(current
      ? [{ id: 'current' as const, title: t(messages.currentDashboard), hint: t(messages.copyOf(current.name)) }]
      : []),
    { id: 'bento' as const, title: t(messages.bento), hint: t(messages.bentoHint) },
    { id: 'blank' as const, title: t(messages.blank), hint: t(messages.blankHint) },
  ]);

  const start = (): DashboardStart =>
    choice === 'current' && current ? { copyOf: current.id } : { template: choice === 'current' ? 'blank' : choice };

  const BLOCKS: Readonly<Record<Choice, string[]>> = {
    calm: ['col-span-2 bg-foreground/40', 'col-span-2', 'col-span-1 row-span-2', 'col-span-1 row-span-2'],
    current: ['col-span-1 row-span-2', 'col-span-1', 'col-span-1', 'col-span-1 row-span-1'],
    bento: ['col-span-1 row-span-2', 'col-span-1', 'col-span-1', 'col-span-2'],
    blank: [],
  };
</script>

<Dialog open onOpenChange={open => !open && onClose()}>
  <DialogContent class="max-w-[620px] gap-0 p-0 sm:max-w-[620px]">
    <form
      class="flex flex-col"
      onsubmit={event => {
        event.preventDefault();
        if (name.trim()) onCreate(name, start(), makeDefault);
      }}
    >
      <header class="border-b border-border px-6 py-5">
        <DialogTitle>{t(messages.newDashboard)}</DialogTitle>
      </header>
      <div class="flex flex-col gap-5 px-6 py-5">
        <div class="flex flex-col gap-1.5">
          <Label for="new-dashboard-name" class="text-xs text-muted-foreground">{t(messages.name)}</Label>
          <Input id="new-dashboard-name" bind:value={name} />
        </div>
        <div class="flex flex-col gap-2">
          <p class="text-xs text-muted-foreground">{t(messages.startFrom)}</p>
          <div role="radiogroup" aria-label={t(messages.startFrom)} class="grid grid-cols-2 gap-3">
            {#each CHOICES as option (option.id)}
              <button
                type="button"
                role="radio"
                aria-checked={choice === option.id}
                class={cn(
                  'flex flex-col gap-2 rounded-xl border p-2.5 text-left',
                  choice === option.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent',
                )}
                onclick={() => (choice = option.id)}
              >
                <span aria-hidden="true" class="grid h-24 grid-cols-2 grid-rows-3 gap-1 rounded-lg bg-muted/70 p-2">
                  {#each BLOCKS[option.id] as block, index (index)}
                    <span class={cn('rounded-sm bg-foreground/15', block)}></span>
                  {/each}
                </span>
                <span class={cn('text-sm', choice === option.id && 'text-primary')}>{option.title}</span>
                <span class="text-xs text-muted-foreground">{option.hint}</span>
              </button>
            {/each}
          </div>
        </div>
        <Label class="flex items-center gap-2 text-sm font-normal">
          <Checkbox bind:checked={makeDefault} />
          {t(messages.makeDefault)}
        </Label>
      </div>
      <footer class="flex items-center gap-3 border-t border-border px-6 py-3">
        <p class="mr-auto text-xs text-muted-foreground">{t(messages.landInEditMode)}</p>
        <Button type="button" variant="ghost" size="sm" onclick={onClose}>{t(messages.cancel)}</Button>
        <Button type="submit" size="sm" disabled={!name.trim()}>{t(messages.createDashboard)}</Button>
      </footer>
    </form>
  </DialogContent>
</Dialog>
