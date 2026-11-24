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
  import {
    httpExample,
    type CreatedToken,
    type TokenExpiry,
    type TokenPreset,
  } from '@shared/domain/structs/api-token.struct.ts';
  import {
    DEFAULT_EXPIRY,
    limitsOf,
    presetKeys,
    type ActionKey,
  } from '@shared/domain/structs/token-actions.struct.ts';
  import { CopyBox, TokenForm } from '@shared/presentation/ui';
  import { formatDay } from '@shared/utils/date-utils.ts';
  import { projectQueries } from '@base/features/project';
  import { personalTokenMutations } from '@base/features/user/presentation/personal-tokens.queries.ts';
  import { personalTokensMessages as messages } from '@base/features/user/presentation/messages/personal-tokens.messages.ts';

  interface Props {
    open: boolean;
    setOpen: (open: boolean) => void;
    /** Empty on the page with no workspace: no project to choose, and no call to show. */
    workspaceId: string;
  }

  let { open, setOpen, workspaceId }: Props = $props();

  const server: string = import.meta.env.VITE_API_URL || window.location.origin;

  const create = createMutation(() => personalTokenMutations.create());
  const projects = createQuery(() => projectQueries.lookup(workspaceId));

  let name = $state('');
  let expiry = $state<TokenExpiry>(DEFAULT_EXPIRY);
  let preset = $state<TokenPreset>('read_only');
  let keys = $state<ActionKey[]>(presetKeys('read_only'));
  let someProjects = $state(false);
  let projectIds = $state<string[]>([]);
  let ready = $state<CreatedToken | null>(null);

  const canSubmit = $derived(
    !!name.trim() &&
      (!someProjects || projectIds.length > 0) &&
      (preset !== 'custom' || keys.length > 0),
  );

  const reset = () => {
    name = '';
    expiry = DEFAULT_EXPIRY;
    preset = 'read_only';
    keys = presetKeys('read_only');
    someProjects = false;
    projectIds = [];
    ready = null;
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const submit = () => {
    create.mutate(
      {
        name: name.trim(),
        expiry,
        limits: limitsOf(preset, keys, someProjects ? projectIds : []),
      },
      { onSuccess: created => (ready = created) },
    );
  };
</script>

<Dialog
  {open}
  onOpenChange={next => {
    if (next) setOpen(true);
    else close();
  }}
>
  <DialogContent class="gap-5 sm:max-w-xl">
    <DialogHeader>
      <DialogTitle>{t(ready ? messages.readyTitle : messages.dialogTitle)}</DialogTitle>
    </DialogHeader>

    {#if ready}
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <span class="flex items-center gap-2 text-sm font-medium">
            {t(messages.personalToken)}
            <span class="rounded-full border px-2 py-0.5 text-xs font-normal">
              {t(messages.shownOnce)}
            </span>
          </span>
          <CopyBox value={ready.secret} copyToast={t(messages.copied)} focusOnMount />
          <p class="text-xs text-muted-foreground">
            {t(messages.copyNow(formatDay(ready.token.expiresAt)))}
          </p>
        </div>
        {#if workspaceId}
          <div class="flex flex-col gap-2">
            <span class="text-sm">{t(messages.callApi)}</span>
            <CopyBox
              value={httpExample(server, workspaceId)}
              layout="lines"
              copyToast={t(messages.copied)}
            />
          </div>
        {/if}
      </div>
      <DialogFooter class="items-center sm:justify-between">
        <span class="text-sm text-muted-foreground">{t(messages.stepOf(2))}</span>
        <Button type="button" variant="outline" onclick={close}>{t(messages.close)}</Button>
      </DialogFooter>
    {:else}
      <TokenForm
        bind:name
        bind:expiry
        bind:preset
        bind:keys
        bind:someProjects
        bind:projectIds
        projects={projects.data?.items ?? []}
        hint={t(messages.limitsHint)}
        idPrefix="personal-token"
      />
      <DialogFooter class="items-center sm:justify-between">
        <span class="text-sm text-muted-foreground">{t(messages.stepOf(1))}</span>
        <div class="flex gap-2">
          <Button type="button" variant="outline" onclick={close}>{t(messages.cancel)}</Button>
          <Button type="button" disabled={!canSubmit || create.isPending} onclick={submit}>
            {t(messages.create)}
          </Button>
        </div>
      </DialogFooter>
    {/if}
  </DialogContent>
</Dialog>
