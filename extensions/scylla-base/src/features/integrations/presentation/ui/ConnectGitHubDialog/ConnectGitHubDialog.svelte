<script lang="ts">
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import FileCodeIcon from '@lucide/svelte/icons/file-code';
  import GitPullRequestIcon from '@lucide/svelte/icons/git-pull-request';
  import ListChecksIcon from '@lucide/svelte/icons/list-checks';
  import ShieldIcon from '@lucide/svelte/icons/shield';
  import { createMutation } from '@scylla/core-sdk';
  import { ScyllaDialog } from '@scylla/ui';
  import { Button, DialogFooter } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { connectGitHubMessages as messages } from '@base/features/integrations/presentation/messages/connect-github.messages.ts';
  import { vcsConnectionMutations } from '@base/features/integrations/presentation/vcs-connection.queries.ts';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspaceId: string;
  }

  let { open, onOpenChange, workspaceId }: Props = $props();

  const install = createMutation(() => vcsConnectionMutations.startGitHubInstall());

  // The names of the permissions on GitHub: not translated.
  const permissions = $derived([
    { icon: FileCodeIcon, title: t(messages.readCode), scopes: 'Contents: read' },
    {
      icon: ListChecksIcon,
      title: t(messages.writeChecks),
      scopes: 'Checks: write · Commit statuses: write',
    },
    {
      icon: GitPullRequestIcon,
      title: t(messages.readPullRequests),
      scopes: 'Pull requests: read · Metadata: read',
    },
    { icon: ShieldIcon, title: t(messages.manageRules), scopes: 'Administration: write' },
  ]);
</script>

<ScyllaDialog
  {open}
  {onOpenChange}
  title={t(messages.title)}
  description={t(messages.description)}
  class="sm:max-w-lg"
>
  <div class="flex flex-col gap-3">
    <h3 class="text-sm">{t(messages.asksFor)}</h3>
    <ul class="flex flex-col gap-3">
      {#each permissions as permission (permission.scopes)}
        <li class="flex items-center gap-3">
          <span
            class="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40"
            aria-hidden="true"
          >
            <permission.icon class="size-4" />
          </span>
          <div class="flex flex-col">
            <span class="text-sm font-medium">{permission.title}</span>
            <code class="font-mono text-xs text-muted-foreground">{permission.scopes}</code>
          </div>
        </li>
      {/each}
    </ul>
    <p class="text-xs text-muted-foreground">{t(messages.events)}</p>
  </div>
  <DialogFooter>
    <Button variant="outline" data-dialog-dismiss onclick={() => onOpenChange(false)}>
      {t(messages.cancel)}
    </Button>
    <Button
      disabled={install.isPending || install.isSuccess}
      onclick={() => install.mutate(workspaceId)}
    >
      {t(messages.install)}
      <ExternalLinkIcon class="size-4" aria-hidden="true" />
    </Button>
  </DialogFooter>
</ScyllaDialog>
