<script lang="ts">
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import CircleSlashIcon from '@lucide/svelte/icons/circle-slash';
  import CircleXIcon from '@lucide/svelte/icons/circle-x';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import { CopyableText, GatedButton } from '@scylla/ui';
  import { Badge, Button, buttonVariants, Switch } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { mergeBlockMessages as messages } from '@base/features/integrations/presentation/messages/merge-block.messages.ts';
  import { repositoryMessages } from '@base/features/integrations/presentation/messages/repository.messages.ts';
  import type { MergeRuleView } from '@base/features/integrations/presentation/presenters/merge-block.presenter.ts';

  interface Props {
    view: MergeRuleView;
    /** The person can change the rules of the project. */
    canManage: boolean;
    /** No change now: another one is sent, or the link cannot serve. */
    locked: boolean;
    onChange: (enabled: boolean) => void;
    onRetry: () => void;
  }

  let { view, canManage, locked, onChange, onRetry }: Props = $props();

  const id = $props.id();
  let byHand = $state(false);

  const ICONS = {
    success: CircleCheckIcon,
    warning: TriangleAlertIcon,
    muted: CircleSlashIcon,
    destructive: CircleXIcon,
  } as const;
  const TONES = {
    success: '[&>svg]:text-success',
    warning: '[&>svg]:text-warning',
    muted: '[&>svg]:text-muted-foreground',
    destructive: '[&>svg]:text-destructive',
  } as const;
  const smallOutline = cn(buttonVariants({ variant: 'outline', size: 'xs' }), 'shrink-0');
  // A link of the text column starts at its left edge, with no padding of a button.
  const TEXT_LINK =
    'inline-flex w-fit items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline';
</script>

<div class="flex items-center gap-3 rounded-lg border px-3 py-3" data-state={view.state}>
  <Switch
    aria-labelledby="{id}-title"
    aria-describedby="{id}-detail"
    disabled={!canManage || locked}
    bind:checked={() => view.checked, next => onChange(next)}
  />
  <div class="flex min-w-0 grow flex-col gap-1.5">
    <p id="{id}-title" class="text-sm font-medium">{view.title}</p>
    <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
      {#if view.state === 'applying'}
        <LoaderCircleIcon
          class="size-3.5 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none"
          aria-hidden="true"
        />
      {/if}
      {#if view.badge}
        {@const Icon = ICONS[view.badge.tone]}
        <Badge variant="outline" class={TONES[view.badge.tone]}>
          <Icon aria-hidden="true" />
          {view.badge.text}
        </Badge>
      {/if}
      <span id="{id}-detail" class="min-w-0 basis-40 grow text-xs text-muted-foreground">
        {view.detail}
      </span>
    </div>
    {#if view.link || view.retry || view.steps.length > 0}
      <div class="flex flex-wrap items-center gap-2">
        {#if view.link}
          <a
            href={view.link.url}
            target="_blank"
            rel="noopener noreferrer"
            class={view.state === 'on' ? TEXT_LINK : smallOutline}
          >
            {view.link.text}
            <ExternalLinkIcon class="size-3" aria-hidden="true" />
          </a>
        {/if}
        {#if view.retry}
          <GatedButton
            variant="outline"
            size="xs"
            class="shrink-0"
            allowed={canManage}
            deniedReason={t(repositoryMessages.onlyEditors)}
            disabled={locked}
            onclick={onRetry}
          >
            {view.retry}
            <RefreshCwIcon class="size-3" aria-hidden="true" />
          </GatedButton>
        {/if}
        {#if view.steps.length > 0}
          <Button
            type="button"
            variant="ghost"
            size="xs"
            aria-expanded={byHand}
            aria-controls="{id}-steps"
            onclick={() => (byHand = !byHand)}
          >
            {t(messages.byHand)}
            <ChevronDownIcon
              class={cn(
                'size-3 transition-transform duration-200 motion-reduce:transition-none',
                byHand && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </Button>
        {/if}
      </div>
    {/if}
    {#if byHand && view.steps.length > 0}
      <ol
        id="{id}-steps"
        class="flex list-decimal flex-col gap-1.5 rounded-md bg-muted py-3 pr-3 pl-7 text-xs"
      >
        {#each view.steps as step (step)}
          <li>{step}</li>
        {/each}
        {#if view.copy}
          <li class="list-none">
            <CopyableText
              value={view.copy}
              copyLabel={t(messages.copyContext(view.copy))}
              class="w-fit rounded-md border bg-card px-2 py-0.5 text-xs"
            />
          </li>
        {/if}
      </ol>
    {/if}
  </div>
</div>
