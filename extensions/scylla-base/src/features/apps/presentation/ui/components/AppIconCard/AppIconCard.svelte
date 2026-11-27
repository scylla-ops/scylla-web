<script lang="ts">
  import PaletteIcon from '@lucide/svelte/icons/palette';
  import SmileIcon from '@lucide/svelte/icons/smile';
  import { createMutation } from '@scylla/core-sdk';
  import { swapIn, swapOut } from '@scylla/ui';
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

  interface Props {
    /** Only the admins of the workspace see the card: `set_app_icon`. */
    app: Pick<AppEntity, 'id' | 'name' | 'icon' | 'runner'>;
    /** Opens the dialog of the icon (`AppIconDialog`), on the Avatar tab with `avatar`. */
    onChange: (avatar: boolean) => void;
  }

  let { app, onChange }: Props = $props();

  const glyphAvatar = $derived(app.icon?.kind === 'image' && !!app.icon.glyph);

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
        <Button
          variant="outline"
          size="sm"
          onclick={() => onChange(false)}
        >
          <PaletteIcon class="size-4" aria-hidden="true" />
          {t(messages.changeIcon)}
        </Button>
        {#if !glyphAvatar}
          <Button
            variant="outline"
            size="sm"
            onclick={() => onChange(true)}
          >
            <SmileIcon class="size-4" aria-hidden="true" />
            {t(messages.makeAvatar)}
          </Button>
        {/if}
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
