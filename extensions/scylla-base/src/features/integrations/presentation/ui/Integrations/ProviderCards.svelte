<script lang="ts">
  import { GatedButton } from '@scylla/ui';
  import { Badge, Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { VcsProvider } from '@base/features/integrations/domain/structs/vcs-provider.struct.ts';
  import { integrationsMessages as messages } from '@base/features/integrations/presentation/messages/integrations.messages.ts';
  import { unavailableText } from '@base/features/integrations/presentation/presenters/connection.presenter.ts';
  import ProviderTile from '../ProviderTile.svelte';
  import type { IntegrationsPage } from './integrations-page.state.svelte.ts';

  interface Props {
    page: IntegrationsPage;
    onConnect: (provider: VcsProvider) => void;
  }

  let { page, onConnect }: Props = $props();

  const cards = $derived(
    (['github', 'gitlab'] as const).map(provider => {
      const connected = page.has(provider);
      const github = provider === 'github';
      return {
        provider,
        title: t(github ? messages.github : messages.gitlab),
        blurb: t(github ? messages.githubBlurb : messages.gitlabBlurb),
        action: t(
          github
            ? connected
              ? messages.addAccount
              : messages.connectGitHub
            : connected
              ? messages.addToken
              : messages.connectGitLab,
        ),
        connected,
        unavailable: unavailableText(page.providerInfo(provider)),
      };
    }),
  );

  const later = $derived([
    { provider: 'github' as const, title: t(messages.githubServer) },
    { provider: 'gitlab' as const, title: t(messages.gitlabSelfManaged) },
  ]);
</script>

<section class="flex flex-col gap-3" aria-labelledby="integrations-providers">
  <h2 id="integrations-providers" class="text-sm">{t(messages.providers)}</h2>
  <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {#each cards as card (card.provider)}
      <li class="flex flex-col gap-4 rounded-xl border bg-card p-5" data-provider={card.provider}>
        <ProviderTile provider={card.provider} />
        <div class="flex grow flex-col gap-1">
          <h3 class="text-sm">{card.title}</h3>
          <p class="text-xs text-muted-foreground">{card.blurb}</p>
        </div>
        <GatedButton
          size="sm"
          variant={card.connected ? 'outline' : 'default'}
          class="w-full"
          allowed={page.canManage && !card.unavailable}
          deniedReason={card.unavailable ?? t(messages.onlyAdmins)}
          onclick={() => onConnect(card.provider)}
        >
          {card.action}
        </GatedButton>
      </li>
    {/each}
    {#each later as card (card.title)}
      <li class="flex flex-col gap-4 rounded-xl border bg-card p-5 text-muted-foreground">
        <div class="flex items-center justify-between gap-2">
          <ProviderTile provider={card.provider} class="opacity-60" />
          <Badge variant="secondary">{t(messages.later)}</Badge>
        </div>
        <div class="flex grow flex-col gap-1">
          <h3 class="text-sm">{card.title}</h3>
          <p class="text-xs">{t(messages.comingLater)}</p>
        </div>
        <Button size="sm" variant="outline" class="w-full" disabled>
          {t(messages.notAvailableYet)}
        </Button>
      </li>
    {/each}
  </ul>
</section>
