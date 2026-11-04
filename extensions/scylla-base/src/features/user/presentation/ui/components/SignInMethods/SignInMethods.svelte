<script lang="ts">
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { ListSkeleton } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { toast } from '@scylla/ui/utils';
  import { i18n } from '@lingui/core';
  import { loginQueries, providerStartUrl } from '@base/features/login';
  import { formatDate } from '@shared/utils/date-utils.ts';
  import {
    myIdentityQueries,
    userMutations,
  } from '@base/features/user/presentation/user.queries.ts';
  import { userMessages } from '@base/features/user/presentation/messages/user.messages.ts';

  const methods = createQuery(() => myIdentityQueries.signInMethods());
  const providers = createQuery(() => loginQueries.signInMethods());
  const unlink = createMutation(() => userMutations.unlinkIdentity());

  const apiUrl: string = import.meta.env.VITE_API_URL ?? '';
  const nameOf = (slug: string) =>
    providers.data?.providers.find(provider => provider.slug === slug)?.displayName ?? slug;

  /** The providers with no identity of the user yet. */
  const linkable = $derived(
    (providers.data?.providers ?? []).filter(
      provider => !(methods.data?.identities ?? []).some(identity => identity.provider === provider.slug),
    ),
  );
  const count = $derived(
    (methods.data?.identities.length ?? 0) + (methods.data?.hasPassword ? 1 : 0),
  );
</script>

{#if methods.isPending}
  <!-- The password, then one identity. -->
  <ListSkeleton rows={2} rowClass="h-10 w-full" />
{:else}
<ul class="flex flex-col divide-y text-sm" aria-label={t(userMessages.signInMethods)}>
  <li class="flex items-center gap-3 py-2">
    <span class="flex-1 font-medium">{t(userMessages.passwordMethod)}</span>
    {#if !methods.data?.hasPassword}
      <span class="text-xs text-muted-foreground">{t(userMessages.noPassword)}</span>
    {/if}
  </li>
  {#each methods.data?.identities ?? [] as identity (`${identity.provider}/${identity.subject}`)}
    <li class="flex items-center gap-3 py-2">
      <span class="min-w-0 flex-1">
        <span class="block font-medium">{nameOf(identity.provider)}</span>
        <span class="block truncate text-xs text-muted-foreground">
          {identity.email || identity.subject} · {t(userMessages.linkedOn(formatDate(identity.linkedAt)))}
        </span>
      </span>
      <Button
        variant="ghost"
        size="sm"
        disabled={unlink.isPending || count <= 1}
        onclick={() =>
          unlink.mutate(
            { provider: identity.provider, subject: identity.subject },
            { onSuccess: () => toast.success(i18n._(userMessages.identityUnlinked)) },
          )}
      >
        {t(userMessages.unlink)}
      </Button>
    </li>
  {/each}
</ul>
{/if}

{#if linkable.length > 0}
  <div class="mt-3 flex flex-wrap gap-2">
    {#each linkable as provider (provider.slug)}
      <Button
        variant="outline"
        size="sm"
        href={providerStartUrl(apiUrl, provider.slug, window.location.origin, window.location.pathname, {
          link: true,
        })}
      >
        {t(userMessages.linkProvider(provider.displayName))}
      </Button>
    {/each}
  </div>
{/if}
