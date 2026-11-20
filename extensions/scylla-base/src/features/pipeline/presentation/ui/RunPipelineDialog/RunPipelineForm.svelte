<script lang="ts">
  import FileCodeIcon from '@lucide/svelte/icons/file-code';
  import GitBranchIcon from '@lucide/svelte/icons/git-branch';
  import GitCommitHorizontalIcon from '@lucide/svelte/icons/git-commit-horizontal';
  import InfoIcon from '@lucide/svelte/icons/info';
  import TagIcon from '@lucide/svelte/icons/tag';
  import { SearchSelect, type SearchSelectOption } from '@scylla/ui';
  import { Button, DialogFooter, Input, Label } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { RepositoryLink } from '@base/features/integrations';
  import type { CommitRef } from '@base/features/pipeline/domain/structs/commit-ref.struct.ts';
  import { runMessages } from '@base/features/pipeline/presentation/messages/run.messages.ts';
  import { providerName } from '@base/features/pipeline/presentation/presenters/pipeline-file.presenter.ts';
  import type { RefOption } from '@base/features/pipeline/presentation/presenters/ref-options.presenter.ts';
  import { createRunTarget } from './run-target.state.svelte.ts';

  interface Props {
    link: RepositoryLink;
    /** The file of a file pipeline: Scylla reads it at the chosen commit. */
    filePath?: string;
    onCancel: () => void;
    onRun: (ref: CommitRef) => void;
  }

  let { link, filePath, onCancel, onRun }: Props = $props();

  const target = createRunTarget({
    projectId: () => link.projectId,
    defaultBranch: () => link.defaultBranch,
  });

  const ICONS = { branch: GitBranchIcon, tag: TagIcon, sha: GitCommitHorizontalIcon };

  const SHA_ISSUES = {
    empty: runMessages.shaEmpty,
    'not-hex': runMessages.shaNotHex,
    length: runMessages.shaLength,
  };

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (target.ref) onRun(target.ref);
  };
</script>

{#snippet refRow(option: SearchSelectOption)}
  {@const Icon = ICONS[(option as RefOption).kind]}
  <span class="flex min-w-0 items-center gap-2">
    <Icon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    <span class="truncate font-mono text-sm">{option.label}</span>
    {#if option.hint}
      <span class="truncate text-xs text-muted-foreground">{option.hint}</span>
    {/if}
  </span>
{/snippet}

<form class="flex flex-col gap-4" onsubmit={submit}>
  <div class="flex flex-col gap-2">
    <Label for="run-target">{t(runMessages.target)}</Label>
    <SearchSelect
      id="run-target"
      options={target.options}
      value={target.value}
      onValueChange={value => target.pick(value)}
      placeholder={t(runMessages.searchRefs)}
      loading={target.loading}
      emptyText={t(runMessages.noRefs)}
      row={refRow}
    />
  </div>

  {#if target.usesSha}
    <div class="flex flex-col gap-2">
      <Label for="run-sha">{t(runMessages.shaLabel)}</Label>
      <Input
        id="run-sha"
        class="font-mono"
        autocomplete="off"
        spellcheck={false}
        placeholder={t(runMessages.shaPlaceholder)}
        value={target.sha}
        oninput={event => target.setSha(event.currentTarget.value)}
        aria-invalid={target.sha.trim() !== '' && !!target.shaIssue}
        aria-describedby="run-sha-issue"
      />
      <!-- An empty field is not an error yet: Run stays disabled, and the line says what to type. -->
      <p
        id="run-sha-issue"
        class={cn(
          'min-h-4 text-xs text-muted-foreground',
          target.sha.trim() !== '' && target.shaIssue && 'text-destructive',
        )}
      >
        {#if target.shaIssue}{t(SHA_ISSUES[target.shaIssue])}{/if}
      </p>
    </div>
  {/if}

  <ul class="flex flex-col gap-2 text-sm text-muted-foreground">
    <li class="flex items-center gap-2">
      <InfoIcon class="size-4 shrink-0" aria-hidden="true" />
      {link.reportsEnabled
        ? t(runMessages.reportsOn(providerName(link.provider)))
        : t(runMessages.reportsOff)}
    </li>
    {#if filePath}
      <li class="flex items-center gap-2">
        <FileCodeIcon class="size-4 shrink-0" aria-hidden="true" />
        <span class="min-w-0 break-words">{t(runMessages.fromFile(filePath))}</span>
      </li>
    {/if}
  </ul>

  <DialogFooter class="gap-2 sm:space-x-0">
    <Button type="button" variant="outline" onclick={onCancel}>{t(runMessages.cancel)}</Button>
    <Button type="submit" disabled={!target.ref}>{t(runMessages.run)}</Button>
  </DialogFooter>
</form>
