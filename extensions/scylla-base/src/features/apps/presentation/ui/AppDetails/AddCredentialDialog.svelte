<script lang="ts">
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import {
    Button,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { TokenExpiry, TokenPreset } from '@shared/domain/structs/api-token.struct.ts';
  import {
    DEFAULT_EXPIRY,
    limitsOf,
    presetKeys,
    type ActionKey,
  } from '@shared/domain/structs/token-actions.struct.ts';
  import { TokenForm } from '@shared/presentation/ui';
  import { projectQueries } from '@base/features/project';
  import type { AppEntity, JoinCode } from '@base/features/apps/domain/entities/app.entity.ts';
  import type { CiProvider } from '@base/features/apps/domain/entities/ci-identity.entity.ts';
  import { ciRuleOf, type CiRefKind } from '@base/features/apps/domain/structs/ci-ref.struct.ts';
  import { appMutations, appQueries, hasJoined } from '@base/features/apps/presentation/apps.queries.ts';
  import {
    credentialMutations,
    type ConnectionKind,
    type ReadyApp,
  } from '@base/features/apps/presentation/app-credentials.queries.ts';
  import CiForm from '../components/CiForm/CiForm.svelte';
  import ConnectionStep from '../components/AddAppDialog/ConnectionStep.svelte';
  import KeyPairStep from '../components/AddAppDialog/KeyPairStep.svelte';
  import ReadyStep from '../components/AddAppDialog/ReadyStep.svelte';
  import { credentialsMessages } from '@base/features/apps/presentation/messages/credentials.messages.ts';
  import { appPageMessages as messages } from '@base/features/apps/presentation/messages/app-page.messages.ts';

  interface Props {
    open: boolean;
    setOpen: (open: boolean) => void;
    app: AppEntity;
    workspaceId: string;
    /** The keys of the app now: a new one shows that a server joined. */
    keysBefore: number;
  }

  let { open, setOpen, app, workspaceId, keysBefore }: Props = $props();

  const server: string = import.meta.env.VITE_API_URL || window.location.origin;

  const createToken = createMutation(() => credentialMutations.createToken(app.id));
  const addIdentity = createMutation(() => credentialMutations.addCiIdentity(app.id));
  const renew = createMutation(() => appMutations.joinCode());
  const projects = createQuery(() => projectQueries.lookup(workspaceId));

  let chosen = $state(false);
  let kind = $state<ConnectionKind>('token');
  let tokenName = $state('');
  let expiry = $state<TokenExpiry>(DEFAULT_EXPIRY);
  let preset = $state<TokenPreset>('read_only');
  let keys = $state<ActionKey[]>(presetKeys('read_only'));
  let someProjects = $state(false);
  let projectIds = $state<string[]>([]);
  let provider = $state<CiProvider>('github');
  let repository = $state('');
  let refKind = $state<CiRefKind>('branch');
  let refValue = $state('main');
  let ready = $state<ReadyApp | null>(null);
  let joinCode = $state<JoinCode | null>(null);
  // svelte-ignore state_referenced_locally
  const baseline = keysBefore;

  const watched = createQuery(() =>
    appQueries.waiting(joinCode ? app.id : '', workspaceId, baseline),
  );
  const joined = $derived(hasJoined(watched.data, baseline));

  const busy = $derived(createToken.isPending || addIdentity.isPending || renew.isPending);
  const canSubmit = $derived(
    kind === 'token'
      ? !!tokenName.trim() && (!someProjects || projectIds.length > 0) &&
        (preset !== 'custom' || keys.length > 0)
      : !!repository.trim(),
  );

  const close = () => setOpen(false);

  const readyWith = (patch: Partial<ReadyApp>): ReadyApp => ({
    created: { app, joinCode: { code: '', expiresAt: '' }, accessGranted: true },
    rolesGranted: true,
    ...patch,
  });

  const next = () => {
    if (kind === 'keypair') {
      renew.mutate(app.id, {
        onSuccess: code => {
          joinCode = code;
          chosen = true;
        },
      });
      return;
    }
    chosen = true;
  };

  const submit = () => {
    if (kind === 'token') {
      createToken.mutate(
        { name: tokenName.trim(), expiry, limits: limitsOf(preset, keys, someProjects ? projectIds : []) },
        { onSuccess: token => (ready = readyWith({ token })) },
      );
      return;
    }
    addIdentity.mutate(
      {
        provider,
        issuer: '',
        repository: repository.trim(),
        ...ciRuleOf(provider, refKind, refValue),
        limits: { preset: 'full', actions: [], projectIds: [] },
      },
      { onSuccess: identity => (ready = readyWith({ identity })) },
    );
  };
</script>

<Dialog
  {open}
  onOpenChange={next => {
    if (!next) close();
  }}
>
  <DialogContent class="gap-5 sm:max-w-xl">
    <DialogHeader>
      <DialogTitle>{t(messages.addCredential)}</DialogTitle>
    </DialogHeader>

    {#if ready}
      <ReadyStep {ready} {workspaceId} {server} />
    {:else if !chosen}
      <ConnectionStep bind:kind />
    {:else if kind === 'keypair' && joinCode}
      <KeyPairStep
        {joinCode}
        onNewCode={() => renew.mutate(app.id, { onSuccess: code => (joinCode = code) })}
        renewing={renew.isPending}
        {joined}
      />
    {:else if kind === 'token'}
      <TokenForm
        bind:name={tokenName}
        bind:expiry
        bind:preset
        bind:keys
        bind:someProjects
        bind:projectIds
        projects={projects.data?.items ?? []}
        hint={t(credentialsMessages.limitsHint)}
        idPrefix="credential-token"
      />
    {:else}
      <CiForm bind:provider bind:repository bind:refKind bind:refValue {server} />
    {/if}

    <DialogFooter>
      {#if ready || (chosen && kind === 'keypair')}
        <Button onclick={close}>{t(credentialsMessages.close)}</Button>
      {:else if !chosen}
        <Button variant="outline" onclick={close}>{t(credentialsMessages.cancel)}</Button>
        <Button onclick={next} disabled={busy}>{t(credentialsMessages.next)}</Button>
      {:else}
        <Button variant="outline" onclick={() => (chosen = false)}>
          {t(credentialsMessages.back)}
        </Button>
        <Button onclick={submit} disabled={!canSubmit || busy}>
          {kind === 'token' ? t(credentialsMessages.createToken) : t(credentialsMessages.addIdentity)}
        </Button>
      {/if}
    </DialogFooter>
  </DialogContent>
</Dialog>
