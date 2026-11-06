<script lang="ts">
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import { ScyllaDialog } from '@scylla/ui';
  import { Button, DialogFooter } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    onboardingMessages as m,
  } from '@base/features/onboarding/presentation/messages/onboarding.messages.ts';
  import TourIcon from './TourIcon.svelte';
  import { SCYLLA_DOCS_URL, type TourDefinition } from './tour-steps.registry.ts';

  interface Props {
    tour: TourDefinition;
    tours: readonly TourDefinition[];
    done: readonly string[];
    onStart: (tourId: string) => void;
    onFinish: () => void;
  }

  let { tour, tours, done, onStart, onFinish }: Props = $props();
</script>

<ScyllaDialog
  open
  onOpenChange={() => {}}
  dismissible={false}
  class="sm:max-w-[500px]"
  title={t(tour.finish.title)}
  description={t(tour.finish.body)}
>
  <ul class="flex flex-col gap-2">
    {#each tours as item (item.id)}
      <li class="flex items-center gap-3 rounded-xl border px-4 py-2.5">
        <TourIcon icon={item.icon} class="text-primary" />
        <span class="flex-1 text-sm font-medium">{t(item.title)}</span>
        <span class="text-xs text-muted-foreground">{t(m.stepTotal(item.steps.length))}</span>
        {#if done.includes(item.id)}
          <span class="flex items-center gap-1 text-xs text-success">
            <CircleCheckIcon class="size-4" aria-hidden="true" />{t(m.done)}
          </span>
        {:else}
          <Button variant="ghost" size="sm" class="text-primary" onclick={() => onStart(item.id)}>
            {t(m.startShort)}
          </Button>
        {/if}
      </li>
    {/each}
  </ul>
  <DialogFooter class="items-center gap-2 sm:justify-between">
    <a
      href={SCYLLA_DOCS_URL}
      target="_blank"
      rel="noreferrer"
      class="text-[13px] font-semibold text-primary hover:underline"
    >
      {t(m.readTheDocs)}
    </a>
    <Button size="sm" onclick={onFinish}>{t(m.finish)}</Button>
  </DialogFooter>
</ScyllaDialog>
