<script lang="ts">
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { Button } from '@scylla/ui/primitives';
  import { FormItemType, ScyllaForm, ScyllaLoadingScreen, type FormItem } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
  import { ScyllaError } from '@shared/utils/scylla-error.ts';
  import AuthLayout from '@shared/presentation/ui/layout/AuthLayout.svelte';
  import {
    loginMutations,
    loginQueries,
  } from '@base/features/login/presentation/login.queries.ts';
  import { pendingLinkMessages as m } from '@base/features/login/presentation/messages/pending-link.messages.ts';

  const pending = createQuery(() => loginQueries.pendingLink());
  const link = createMutation(() => loginMutations.linkPendingIdentity());

  const items: readonly FormItem<'password'>[] = $derived(
    pending.data
      ? [
          {
            id: 'password',
            label: t(m.passwordOf(pending.data.email)),
            placeholder: t(m.passwordPlaceholder),
            type: FormItemType.Input,
            inputType: 'password',
            autocomplete: 'current-password',
          },
        ]
      : [],
  );

  // Only an answer of the server says that the link is gone. A failure of the network does not: the
  // link still waits, and the person tries again.
  const unreachable = $derived(
    pending.error ? ScyllaError.from(pending.error).isNetworkError() : false,
  );
  const linkGone = $derived(
    link.error ? ScyllaError.from(link.error).code === 'NOT_FOUND' : false,
  );
</script>

{#if link.isSuccess || pending.isPending}
  <ScyllaLoadingScreen />
{:else if unreachable}
  <AuthLayout title={t(m.unreachableTitle)} description={t(m.unreachable)}>
    <Button class="w-full" onclick={() => pending.refetch()}>{t(m.tryAgain)}</Button>
  </AuthLayout>
{:else if !pending.data || linkGone}
  <AuthLayout title={t(m.expiredTitle)} description={t(m.expired)}>
    <Button href="/login" class="w-full">{t(m.startAgain)}</Button>
  </AuthLayout>
{:else}
  <AuthLayout
    title={t(m.title)}
    description={t(m.description(pending.data.email, pending.data.providerName))}
  >
    <div class="mb-4 flex items-center gap-3 rounded-lg border p-3 text-center text-sm">
      <span class="min-w-0 flex-1">
        <span class="block truncate font-medium">
          {pending.data.displayName || pending.data.email}
        </span>
        <span class="block text-xs text-muted-foreground">{pending.data.providerName}</span>
      </span>
      <ArrowRightIcon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span class="min-w-0 flex-1">
        <span class="block truncate font-medium">{pending.data.email}</span>
        <span class="block text-xs text-muted-foreground">{t(m.scyllaAccount)}</span>
      </span>
    </div>

    <ScyllaForm
      {items}
      class="gap-4"
      isPending={link.isPending}
      onSubmit={values => link.mutate(values.password)}
    >
      {#snippet footer({ isValid, isPending })}
        {#if link.error}
          <p role="alert" class="text-center text-sm text-destructive">
            {ScyllaError.from(link.error).userMessage()}
          </p>
        {/if}
        <Button type="submit" class="mt-2 w-full" disabled={!isValid || isPending}>
          {t(m.submit(pending.data?.providerName ?? ''))}
        </Button>
      {/snippet}
    </ScyllaForm>
    <Button href="/login" variant="outline" class="mt-2 w-full">{t(m.notMine)}</Button>
    <p class="mt-6 text-center text-xs text-muted-foreground">{t(m.why)}</p>
  </AuthLayout>
{/if}
