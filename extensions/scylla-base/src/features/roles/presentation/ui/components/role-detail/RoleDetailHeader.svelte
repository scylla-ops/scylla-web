<script lang="ts">
  import BotIcon from '@lucide/svelte/icons/bot';
  import LockIcon from '@lucide/svelte/icons/lock';
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
  import { RoleKind } from '@platform/authz';
  import { Badge } from '@scylla/ui/shadcn';
  import { GatedButton } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import type { RoleEntity } from '../../../../domain/entities/role.entity.ts';
  import type { RolesPage } from '../../../roles-page.state.svelte.ts';
  import { scopeLabelOf } from '../../../utils/permission-mapping.ts';
  import { rolesMessages } from '../../roles.messages.ts';

  interface Props {
    role: RoleEntity;
    page: RolesPage;
  }

  let { role, page }: Props = $props();

  const appsOnly = $derived(role.kind === RoleKind.AGENT);
  const readOnly = $derived(page.isReadOnly(role));

  /** From an organization: whose role it is. On the platform page: how it came to be. */
  const originLabel = $derived.by(() => {
    if (page.scope.kind === 'organization') {
      return readOnly ? t(rolesMessages.platform) : page.scope.organizationName;
    }
    return {
      builtin: t(rolesMessages.builtin),
      custom: t(rolesMessages.custom),
      // "Unknown" is feminine here, to agree with "origine".
      unknown: t(rolesMessages.unknownOrigin),
    }[role.origin.kind];
  });
</script>

<section class="flex flex-col gap-4">
  <div class="flex items-start justify-between gap-4">
    <div class="flex min-w-0 items-start gap-3">
      <div
        class={[
          'flex size-11 shrink-0 items-center justify-center rounded-xl',
          readOnly ? 'bg-muted' : 'bg-primary/10',
        ]}
      >
        {#if appsOnly}
          <BotIcon class={['size-5', readOnly ? 'text-muted-foreground' : 'text-primary']} />
        {:else}
          <ShieldCheckIcon class={['size-5', readOnly ? 'text-muted-foreground' : 'text-primary']} />
        {/if}
      </div>
      <div class="min-w-0">
        <h2 class="truncate text-xl font-bold tracking-tight">{role.name}</h2>
        <p class="text-sm text-muted-foreground">
          {role.description || t(rolesMessages.noDescription)}
        </p>
      </div>
    </div>
    {#if readOnly}
      <Badge variant="secondary" class="shrink-0 gap-1">
        <LockIcon class="size-3" />
        {t(rolesMessages.readOnly)}
      </Badge>
    {:else}
      <GatedButton
        allowed={page.canManageRoles}
        deniedReason={t(rolesMessages.editDenied)}
        variant="outline"
        disabled={role.origin.kind === 'builtin'}
        onclick={() => page.openEdit(role)}
      >
        <PencilIcon class="size-4" />
        {t(rolesMessages.edit)}
      </GatedButton>
    {/if}
  </div>
  <div class="flex flex-wrap gap-2">
    <Badge variant="secondary">{scopeLabelOf(role.scope)}</Badge>
    <Badge
      variant="outline"
      class={page.scope.kind === 'organization' && !readOnly
        ? 'border-transparent bg-primary/10 text-primary'
        : ''}
    >
      {originLabel}
    </Badge>
    <Badge variant="outline">
      {appsOnly ? t(rolesMessages.appsOnly) : t(rolesMessages.forPeople)}
    </Badge>
    {#if role.access.kind === 'fullControl'}
      <Badge>{t(rolesMessages.fullControl)}</Badge>
    {/if}
  </div>
</section>
