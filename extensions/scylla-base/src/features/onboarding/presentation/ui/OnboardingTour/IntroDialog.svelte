<script lang="ts">
  import { fly } from 'svelte/transition';
  import { motionDuration } from '@scylla/ui';
  import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    onboardingMessages as m,
  } from '@base/features/onboarding/presentation/messages/onboarding.messages.ts';
  import { introSlides } from '@base/features/onboarding/presentation/presenters/intro.presenter.ts';
  import IntroIllustration from './IntroIllustration.svelte';
  import TourChooser from './TourChooser.svelte';
  import { SCYLLA_DOCS_URL, type TourDefinition } from './tour-steps.registry.ts';

  interface Props {
    open: boolean;
    tours: readonly TourDefinition[];
    done: readonly string[];
    onStart: (tourId: string) => void;
    onSkip: () => void;
  }

  let { open, tours, done, onStart, onSkip }: Props = $props();

  let index = $state(0);
  const total = introSlides.length;
  const slide = $derived(introSlides[index]);
  const choosing = $derived(index >= total);
</script>

<Dialog {open} onOpenChange={() => {}}>
  <DialogContent
    class="gap-5 sm:max-w-[560px] [&_[data-dialog-close]]:hidden"
    interactOutsideBehavior="ignore"
    escapeKeydownBehavior="ignore"
    data-tour="onboarding-intro"
  >
    <div class="flex items-center gap-2">
      <span class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {choosing ? t(m.introEyebrow) : t(m.introEyebrowCount(index + 1, total))}
      </span>
      <span class="flex-1"></span>
      <button
        type="button"
        class="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        onclick={onSkip}
      >
        {t(m.skip)}
      </button>
    </div>

    {#key index}
      <div class="flex flex-col gap-4" in:fly={{ x: 24, duration: motionDuration(220) }}>
        {#if slide}
          <IntroIllustration kind={slide.kind} />
          <div class="flex flex-col gap-2">
            <DialogTitle class="text-xl">{t(slide.title)}</DialogTitle>
            <DialogDescription class="text-sm leading-relaxed text-muted-foreground">
              {t(slide.body)}
            </DialogDescription>
            <a
              href={SCYLLA_DOCS_URL}
              target="_blank"
              rel="noreferrer"
              class="self-start text-[13px] font-semibold text-primary hover:underline"
            >
              {t(slide.docs)}
            </a>
          </div>
        {:else}
          <div class="flex flex-col gap-2">
            <DialogTitle class="text-xl">{t(m.chooserTitle)}</DialogTitle>
            <DialogDescription class="text-sm leading-relaxed text-muted-foreground">
              {t(m.chooserBody)}
            </DialogDescription>
          </div>
          <TourChooser {tours} {done} {onStart} />
          <p class="text-xs text-muted-foreground">{t(m.chooserLater)}</p>
        {/if}
      </div>
    {/key}

    <div class="flex items-center gap-2 border-t pt-4">
      {#if index > 0}
        <Button variant="outline" size="sm" onclick={() => (index -= 1)}>{t(m.previous)}</Button>
      {/if}
      <span class="flex-1"></span>
      {#if choosing}
        <a
          href={SCYLLA_DOCS_URL}
          target="_blank"
          rel="noreferrer"
          class="text-[13px] font-semibold text-primary hover:underline"
        >
          {t(m.readTheDocs)}
        </a>
        <Button variant="outline" size="sm" onclick={onSkip}>{t(m.exploreAlone)}</Button>
      {:else}
        <Button size="sm" onclick={() => (index += 1)}>
          {index === total - 1 ? t(m.chooseTour) : t(m.next)}
        </Button>
      {/if}
    </div>
  </DialogContent>
</Dialog>
