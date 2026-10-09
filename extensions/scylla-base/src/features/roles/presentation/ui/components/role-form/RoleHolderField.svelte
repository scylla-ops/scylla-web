<script lang="ts">
  import BotIcon from '@lucide/svelte/icons/bot';
  import UserIcon from '@lucide/svelte/icons/user';
  import { RoleKind } from '@platform/authz';
  import { Label, ToggleGroup, ToggleGroupItem } from '@scylla/ui/shadcn';
  import { t } from '@scylla/ui/i18n';
  import { rolesMessages } from '../../roles.messages.ts';

  interface Props {
    kind: RoleKind;
    /** Shown, never changed: an edited role keeps who holds it. */
    fixed: boolean;
    disabled: boolean;
    /** `null` for a platform role. */
    organizationName: string | null;
    onKindChange: (kind: RoleKind) => void;
  }

  let { kind, fixed, disabled, organizationName, onKindChange }: Props = $props();

  const hint = $derived.by(() => {
    if (fixed) return t(rolesMessages.kindIsFixed);
    if (kind === RoleKind.AGENT) {
      return organizationName === null
        ? t(rolesMessages.platformAppsHint)
        : t(rolesMessages.organizationAppsHint(organizationName));
    }
    return organizationName === null
      ? t(rolesMessages.platformPeopleHint)
      : t(rolesMessages.organizationPeopleHint(organizationName));
  });
</script>

<div class="flex flex-col gap-1.5">
  <Label id="role-holder-label">{t(rolesMessages.whoHoldsIt)}</Label>
  <ToggleGroup
    type="single"
    variant="outline"
    class="w-full"
    aria-labelledby="role-holder-label"
    value={kind === RoleKind.AGENT ? 'apps' : 'people'}
    disabled={fixed || disabled}
    onValueChange={value => {
      if (value) onKindChange(value === 'apps' ? RoleKind.AGENT : RoleKind.MEMBER);
    }}
  >
    <ToggleGroupItem value="people" class="flex-1">
      <UserIcon />
      {t(rolesMessages.people)}
    </ToggleGroupItem>
    <ToggleGroupItem value="apps" class="flex-1">
      <BotIcon />
      {t(rolesMessages.apps)}
    </ToggleGroupItem>
  </ToggleGroup>
  <p class="text-xs text-muted-foreground">{hint}</p>
</div>
