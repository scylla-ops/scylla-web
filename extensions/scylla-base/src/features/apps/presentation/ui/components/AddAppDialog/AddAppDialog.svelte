<script lang="ts">
  import { fly } from 'svelte/transition';
  import { scyllaNavigate } from '@platform/context';
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
  import type { JoinCode } from '@base/features/apps/domain/entities/app.entity.ts';
  import type { CiProvider } from '@base/features/apps/domain/entities/ci-identity.entity.ts';
  import { grantsOf } from '@base/features/apps/domain/structs/app-grants.struct.ts';
  import { ciRuleOf, type CiRefKind } from '@base/features/apps/domain/structs/ci-ref.struct.ts';
  import {
    appMutations,
    appQueries,
    hasJoined,
  } from '@base/features/apps/presentation/apps.queries.ts';
  import {
    credentialMutations,
    type ConnectionKind,
    type NewCredential,
    type ReadyApp,
  } from '@base/features/apps/presentation/app-credentials.queries.ts';
  import StepBar from '../AddAgentDialog/StepBar.svelte';
  import CiForm from '../CiForm/CiForm.svelte';
  import RolesStep from './RolesStep.svelte';
  import ConnectionStep from './ConnectionStep.svelte';
  import KeyPairStep from './KeyPairStep.svelte';
  import ReadyStep from './ReadyStep.svelte';
  import { credentialsMessages as messages } from '@base/features/apps/presentation/messages/credentials.messages.ts';

  interface Props {
    open: boolean;
    setOpen: (open: boolean) => void;
    workspaceId: string;
    workspaceName: string;
  }

  let { open, setOpen, workspaceId, workspaceName }: Props = $props();

  const server: string = import.meta.env.VITE_API_URL || window.location.origin;

  const create = createMutation(() => credentialMutations.createApp(workspaceId));
  const renew = createMutation(() => appMutations.joinCode());
  const projects = createQuery(() => projectQueries.lookup(workspaceId));

  let step = $state(0);
  let name = $state('');
  let workspaceRole = $state('member');
  let projectRoles = $state<Record<string, string>>({});
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

  const watched = createQuery(() =>
    appQueries.waiting(
      ready && kind === 'keypair' ? ready.created.app.id : '',
      workspaceId,
      0,
    ),
  );
  const joined = $derived(hasJoined(watched.data, 0));

  const STEPS = $derived([
    t(messages.stepRoles),
    t(messages.stepConnection),
    t(messages.stepCredential),
  ]);
  const done = $derived(!!ready);
  const canSubmit = $derived(
    kind === 'token'
      ? !!tokenName.trim() && (!someProjects || projectIds.length > 0) &&
        (preset !== 'custom' || keys.length > 0)
      : kind === 'ci'
        ? !!repository.trim()
        : true,
  );

  const close = () => {
    setOpen(false);
    step = 0;
    name = '';
    workspaceRole = 'member';
    projectRoles = {};
    kind = 'token';
    tokenName = '';
    expiry = DEFAULT_EXPIRY;
    preset = 'read_only';
    keys = presetKeys('read_only');
    someProjects = false;
    projectIds = [];
    provider = 'github';
    repository = '';
    refKind = 'branch';
    refValue = 'main';
    ready = null;
    joinCode = null;
    create.reset();
  };

  const credential = (): NewCredential => {
    const limits = limitsOf(preset, keys, someProjects ? projectIds : []);
    if (kind === 'token') return { kind, input: { name: tokenName.trim(), expiry, limits } };
    if (kind === 'ci') {
      return {
        kind,
        input: {
          provider,
          issuer: '',
          repository: repository.trim(),
          ...ciRuleOf(provider, refKind, refValue),
          limits: { preset: 'full', actions: [], projectIds: [] },
        },
      };
    }
    return { kind };
  };

  const submit = () =>
    create.mutate(
      { name, grants: grantsOf(workspaceRole, projectRoles), credential: credential() },
      {
        onSuccess: result => {
          ready = result;
          joinCode = result.created.joinCode;
          step = 2;
        },
      },
    );

  const next = () => {
    if (step === 0 && name.trim()) step = 1;
    else if (step === 1 && kind === 'keypair') submit();
    else if (step === 1) step = 2;
  };

  const newCode = () => {
    if (!ready) return;
    renew.mutate(ready.created.app.id, { onSuccess: code => (joinCode = code) });
  };

  const openApp = () => {
    const id = ready?.created.app.id;
    close();
    if (id) scyllaNavigate.goToWorkspaceRoute(`/apps/${id}`);
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
      <DialogTitle>
        {done && kind !== 'keypair' ? t(messages.readyTitle(name.trim())) : t(messages.addApp)}
      </DialogTitle>
    </DialogHeader>
    <StepBar labels={STEPS} current={done && kind !== 'keypair' ? 3 : step} />

    {#key `${step}-${done}`}
      <div in:fly={{ x: 24, duration: 220 }}>
        {#if step === 0}
          <RolesStep
            {workspaceId}
            {workspaceName}
            bind:name
            bind:workspaceRole
            bind:projectRoles
          />
        {:else if step === 1}
          <ConnectionStep bind:kind />
        {:else if kind === 'keypair' && ready && joinCode}
          <KeyPairStep {joinCode} onNewCode={newCode} renewing={renew.isPending} {joined} />
        {:else if ready}
          <ReadyStep {ready} {workspaceId} {server} />
        {:else if kind === 'token'}
          <TokenForm
            bind:name={tokenName}
            bind:expiry
            bind:preset
            bind:keys
            bind:someProjects
            bind:projectIds
            projects={projects.data?.items ?? []}
            hint={t(messages.limitsHint)}
            idPrefix="app-token"
          />
        {:else}
          <CiForm bind:provider bind:repository bind:refKind bind:refValue {server} />
        {/if}
      </div>
    {/key}

    <DialogFooter class="items-center border-t pt-4 sm:justify-between">
      <span class="text-xs text-muted-foreground">
        {t(messages.stepOf(Math.min(step + 1, 3)))}
      </span>
      <div class="flex gap-2">
        {#if done}
          <Button variant="outline" onclick={close}>{t(messages.close)}</Button>
          <Button onclick={openApp}>{t(messages.openApp)}</Button>
        {:else if step === 0}
          <Button variant="outline" onclick={close}>{t(messages.cancel)}</Button>
          <Button onclick={next} disabled={!name.trim()}>{t(messages.next)}</Button>
        {:else if step === 1}
          <Button variant="outline" onclick={() => (step = 0)}>{t(messages.back)}</Button>
          <Button onclick={next} disabled={create.isPending}>{t(messages.next)}</Button>
        {:else}
          <Button variant="outline" onclick={() => (step = 1)}>{t(messages.back)}</Button>
          <Button onclick={submit} disabled={!canSubmit || create.isPending}>
            {kind === 'token' ? t(messages.createToken) : t(messages.addIdentity)}
          </Button>
        {/if}
      </div>
    </DialogFooter>
  </DialogContent>
</Dialog>
