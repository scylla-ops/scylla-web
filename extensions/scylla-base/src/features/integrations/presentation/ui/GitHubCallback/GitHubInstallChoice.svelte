<script lang="ts">
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import { Avatar, AvatarFallback, AvatarImage, Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { ProviderMark } from '@shared/presentation/ui';
  import type { GitHubInstallChoice } from '@base/features/integrations/domain/entities/vcs-connection.entity.ts';
  import { connectGitHubMessages as messages } from '@base/features/integrations/presentation/messages/connect-github.messages.ts';
  import { accountKindLabel } from '@base/features/integrations/presentation/presenters/connection.presenter.ts';

  interface Props {
    choice: GitHubInstallChoice;
    /** The Integrations page, to stop. */
    backHref: string;
  }

  let { choice, backHref }: Props = $props();
</script>

<span class="flex size-12 items-center justify-center rounded-full bg-muted" aria-hidden="true">
  <ProviderMark kind="github" class="size-5" />
</span>
<h1>{t(messages.chooseTitle)}</h1>
<p class="text-sm text-muted-foreground">{t(messages.chooseBody)}</p>
<ul class="flex w-full flex-col divide-y rounded-lg border text-left">
  {#each choice.installations as option (option.installationId)}
    <li class="flex items-center gap-3 p-3">
      <Avatar class="size-8" aria-hidden="true">
        {#if option.avatarUrl}
          <AvatarImage src={option.avatarUrl} alt="" />
        {/if}
        <AvatarFallback class="text-xs uppercase">{option.account.slice(0, 2)}</AvatarFallback>
      </Avatar>
      <div class="flex min-w-0 flex-1 flex-col">
        <span class="truncate text-sm font-medium">{option.account}</span>
        <span class="text-xs text-muted-foreground">{accountKindLabel(option.accountKind)}</span>
      </div>
      <Button
        size="sm"
        href={option.connectUrl}
        aria-label={t(messages.connectAccount(option.account))}
      >
        {t(messages.connect)}
      </Button>
    </li>
  {/each}
</ul>
<div class="flex flex-wrap justify-center gap-2">
  <Button variant="outline" href={backHref}>{t(messages.cancel)}</Button>
  <Button variant="outline" href={choice.installUrl}>
    {t(messages.installElsewhere)}
    <ExternalLinkIcon class="size-4" aria-hidden="true" />
  </Button>
</div>
