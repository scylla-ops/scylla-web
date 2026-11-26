<script lang="ts">
  import PaletteIcon from '@lucide/svelte/icons/palette';
  import { createMutation } from '@scylla/core-sdk';
  import { ScyllaDialog, swapIn, swapOut } from '@scylla/ui';
  import {
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { IdentityAvatar } from '@shared/presentation/ui';
  import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import { appMutations } from '@base/features/apps/presentation/apps.queries.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import { appPageMessages } from '@base/features/apps/presentation/messages/app-page.messages.ts';
  import { agentProfile } from '@base/features/apps/presentation/presenters/agent-icon.presenter.ts';
  import AppIconForm from './AppIconForm.svelte';

  interface Props {
    /** Only the admins of the workspace see the card: `set_app_icon`. */
    app: Pick<AppEntity, 'id' | 'name' | 'icon' | 'runner'>;
    /** The dialog of the icon: the avatar of the header of the agent page opens it too. */
    open?: boolean;
  }

  let { app, open = $bindable(false) }: Props = $props();

  const reset = createMutation(() => appMutations.setIcon());
  const title = $derived(t(app.runner ? messages.icon : appPageMessages.icon));
  const iconKey = $derived(JSON.stringify(app.icon ?? null));
</script>

<Card>
  <CardHeader>
    <CardTitle><h2>{title}</h2></CardTitle>
    <CardDescription>
      {t(app.runner ? messages.iconDescription : appPageMessages.iconDescription)}
    </CardDescription>
  </CardHeader>
  <CardContent class="flex items-center gap-4">
    <!-- A new icon fades in over the old one. -->
    <span class="grid shrink-0 place-items-center">
      {#key iconKey}
        <span class="col-start-1 row-start-1 flex" in:swapIn out:swapOut>
          <IdentityAvatar
            profile={agentProfile(app)}
            kind={app.runner ? 'agent' : 'app'}
            size={48}
          />
        </span>
      {/key}
    </span>
    <div class="flex min-w-0 flex-col gap-1.5">
      <div class="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onclick={() => (open = true)}>
          <PaletteIcon class="size-4" aria-hidden="true" />
          {t(messages.changeIcon)}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!app.icon || reset.isPending}
          onclick={() => reset.mutate({ appId: app.id, icon: { kind: 'default' } })}
        >
          {t(messages.resetIcon)}
        </Button>
      </div>
      <p class="text-xs text-muted-foreground">{t(messages.iconHint)}</p>
    </div>
  </CardContent>
</Card>

<!-- The form is built again at each opening: it starts on the icon of the app. -->
<ScyllaDialog
  {open}
  onOpenChange={next => (open = next)}
  {title}
  description={t(app.runner ? messages.iconDialogDescription : appPageMessages.iconDialogDescription)}
  class="sm:max-w-lg"
>
  <AppIconForm {app} close={() => (open = false)} />
</ScyllaDialog>
