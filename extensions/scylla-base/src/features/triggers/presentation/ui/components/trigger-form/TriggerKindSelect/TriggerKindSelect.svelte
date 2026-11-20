<script lang="ts">
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
  import {
    Button,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Separator,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { VcsProvider } from '@base/features/integrations';
  import {
    GIT_KINDS,
    type TriggerDraftKind,
  } from '@base/features/triggers/domain/entities/trigger.entity.ts';
  import { gitKindLabel } from '@base/features/triggers/presentation/presenters/trigger-source.presenter.ts';
  import { triggersMessages } from '@base/features/triggers/presentation/messages/triggers.messages.ts';
  import { KIND_ICONS } from '../../../trigger-kind-icons.registry.ts';

  interface Props {
    value: TriggerDraftKind;
    /** Why the Git kinds are off: no linked repository, or a pipeline file gives them. */
    gitOff?: 'noLink' | 'fromFile';
    provider?: VcsProvider;
    disabled?: boolean;
    onChange: (kind: TriggerDraftKind) => void;
    onLinkRepository: () => void;
  }

  let { value, gitOff, provider, disabled = false, onChange, onLinkRepository }: Props = $props();

  const OTHER_KINDS = [
    { kind: 'cron', label: triggersMessages.kindSchedule },
    { kind: 'webhook', label: triggersMessages.kindWebhook },
  ] as const;
</script>

{#snippet option(kind: TriggerDraftKind, label: string, itemDisabled: boolean)}
  {@const Icon = KIND_ICONS[kind]}
  <SelectItem value={kind} {label} disabled={itemDisabled}>
    <Icon class="size-4" />
    {label}
  </SelectItem>
{/snippet}

<div class="flex flex-col gap-1.5">
  <Label for="trigger-kind">{t(triggersMessages.type)}</Label>
  <Select
    type="single"
    {value}
    {disabled}
    onValueChange={next => onChange(next as TriggerDraftKind)}
  >
    <SelectTrigger id="trigger-kind" class="w-full">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {#each OTHER_KINDS as other (other.kind)}
        {@render option(other.kind, t(other.label), false)}
      {/each}
      <Separator class="-mx-1 my-1" />
      {#each GIT_KINDS as kind (kind)}
        {@render option(kind, gitKindLabel(kind, provider), !!gitOff)}
      {/each}
      {#if gitOff === 'noLink'}
        <div class="flex flex-col items-start gap-1 px-2 pt-1 pb-1.5">
          <p class="text-xs text-muted-foreground">{t(triggersMessages.needRepository)}</p>
          <Button variant="link" size="xs" class="px-0" onclick={onLinkRepository}>
            {t(triggersMessages.linkRepositoryFirst)}
            <ArrowRightIcon />
          </Button>
        </div>
      {:else if gitOff === 'fromFile'}
        <p class="px-2 pt-1 pb-1.5 text-xs text-muted-foreground">
          {t(triggersMessages.gitFromFile)}
        </p>
      {/if}
    </SelectContent>
  </Select>
</div>
