<script lang="ts">
  import { createMutation } from '@scylla/core-sdk';
  import {
    Button,
    Checkbox,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Input,
    Label,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { CreatedApp } from '@base/features/apps/domain/entities/app.entity.ts';
  import { appMutations } from '@base/features/apps/presentation/apps.queries.ts';
  import JoinCodePanel from '../JoinCodePanel/JoinCodePanel.svelte';
  import { appsMessages } from '@base/features/apps/presentation/messages/apps.messages.ts';

  interface Props {
    open: boolean;
    setOpen: (open: boolean) => void;
    workspaceId: string;
    /** The kind of app that the list shows: a new app of the agents view runs jobs. */
    runner?: boolean;
  }

  let { open, setOpen, workspaceId, runner: defaultRunner = true }: Props = $props();

  const create = createMutation(() => appMutations.create(workspaceId));

  let name = $state('');
  // svelte-ignore state_referenced_locally
  let runner = $state(defaultRunner);
  let created = $state<CreatedApp | null>(null);

  const close = () => {
    setOpen(false);
    name = '';
    created = null;
    create.reset();
  };

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    create.mutate({ name, runner }, { onSuccess: result => (created = result) });
  };
</script>

<Dialog
  {open}
  onOpenChange={next => {
    if (!next) close();
  }}
>
  <DialogContent class="sm:max-w-lg">
    {#if created}
      <DialogHeader>
        <DialogTitle>{t(appsMessages.joinTitle)}</DialogTitle>
      </DialogHeader>
      <JoinCodePanel joinCode={created.joinCode} runner={created.app.runner} />
      <DialogFooter data-tour="app-dialog-actions">
        <Button onclick={close}>{t(appsMessages.done)}</Button>
      </DialogFooter>
    {:else}
      <DialogHeader>
        <DialogTitle>{t(appsMessages.createTitle)}</DialogTitle>
        <DialogDescription>{t(appsMessages.createDescription)}</DialogDescription>
      </DialogHeader>
      <form class="flex flex-col gap-4" onsubmit={submit}>
        <div class="flex flex-col gap-1.5">
          <Label for="app-name">{t(appsMessages.name)}</Label>
          <Input
            id="app-name"
            bind:value={name}
            placeholder={t(appsMessages.namePlaceholder)}
            autocomplete="off"
          />
        </div>
        <Label class="flex items-center gap-2 font-normal">
          <Checkbox checked={runner} onCheckedChange={value => (runner = value === true)} />
          {t(appsMessages.runner)}
        </Label>
        <DialogFooter>
          <Button type="submit" disabled={!name.trim() || create.isPending}>
            {t(appsMessages.create)}
          </Button>
        </DialogFooter>
      </form>
    {/if}
  </DialogContent>
</Dialog>
