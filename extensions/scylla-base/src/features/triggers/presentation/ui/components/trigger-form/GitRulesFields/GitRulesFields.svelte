<script lang="ts">
  import { Checkbox, Label } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { VcsProvider } from '@base/features/integrations';
  import type {
    GitSource,
    PullRequestEvent,
  } from '@base/features/triggers/domain/entities/trigger.entity.ts';
  import {
    PULL_REQUEST_EVENTS,
    pullRequestEventLabel,
  } from '@base/features/triggers/presentation/presenters/trigger-source.presenter.ts';
  import { triggersMessages } from '@base/features/triggers/presentation/messages/triggers.messages.ts';
  import GitTriggerNotes from '../../GitTriggerNotes/GitTriggerNotes.svelte';
  import GlobChipsInput from '../GlobChipsInput/GlobChipsInput.svelte';

  interface Props {
    source: GitSource;
    provider?: VcsProvider;
    disabled?: boolean;
    onChange: (source: GitSource) => void;
  }

  let { source, provider, disabled = false, onChange }: Props = $props();

  const toggleEvent = (events: PullRequestEvent[], event: PullRequestEvent, on: boolean) =>
    on
      ? PULL_REQUEST_EVENTS.filter(known => known === event || events.includes(known))
      : events.filter(known => known !== event);
</script>

{#snippet check(id: string, label: string, checked: boolean, change: (on: boolean) => void)}
  <Label for={id} class="flex items-center gap-2 font-normal">
    <Checkbox {id} {checked} {disabled} onCheckedChange={on => change(on === true)} />
    {label}
  </Label>
{/snippet}

{#if source.kind === 'push'}
  <GlobChipsInput
    id="trigger-push-branches"
    label={t(triggersMessages.branchesToInclude)}
    values={source.branches}
    placeholder={t(triggersMessages.addBranch)}
    hint={t(triggersMessages.emptyIsEachBranch)}
    {disabled}
    onChange={branches => onChange({ ...source, branches })}
  />
  <GlobChipsInput
    id="trigger-push-exclude"
    label={t(triggersMessages.branchesToExclude)}
    values={source.excludeBranches}
    placeholder={t(triggersMessages.addBranch)}
    {disabled}
    onChange={excludeBranches => onChange({ ...source, excludeBranches })}
  />
  {@render check('trigger-push-skip-ci', t(triggersMessages.skipCi), source.skipCi, skipCi =>
    onChange({ ...source, skipCi }),
  )}
{:else if source.kind === 'pullRequest'}
  <GlobChipsInput
    id="trigger-pull-request-branches"
    label={t(triggersMessages.targetBranches)}
    values={source.branches}
    placeholder={t(triggersMessages.addBranch)}
    hint={t(triggersMessages.emptyIsEachBranch)}
    {disabled}
    onChange={branches => onChange({ ...source, branches })}
  />
  <fieldset class="flex flex-col gap-1.5">
    <legend class="mb-1.5 text-sm font-medium">{t(triggersMessages.events)}</legend>
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
      {#each PULL_REQUEST_EVENTS as event (event)}
        {@render check(
          `trigger-event-${event}`,
          pullRequestEventLabel(event),
          source.events.includes(event),
          on => onChange({ ...source, events: toggleEvent(source.events, event, on) }),
        )}
      {/each}
    </div>
    {#if source.events.length === 0}
      <p class="text-xs text-destructive">{t(triggersMessages.chooseAnEvent)}</p>
    {/if}
  </fieldset>
  {@render check(
    'trigger-pull-request-drafts',
    provider === 'gitlab'
      ? t(triggersMessages.skipDraftMergeRequests)
      : t(triggersMessages.skipDraftPullRequests),
    !source.drafts,
    skip => onChange({ ...source, drafts: !skip }),
  )}
{:else}
  <GlobChipsInput
    id="trigger-tag-patterns"
    label={t(triggersMessages.tagPatterns)}
    values={source.patterns}
    placeholder={t(triggersMessages.addTag)}
    hint={t(triggersMessages.emptyIsEachTag)}
    {disabled}
    onChange={patterns => onChange({ ...source, patterns })}
  />
{/if}

<GitTriggerNotes {provider} />
