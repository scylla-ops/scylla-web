<script lang="ts">
  import { type PermissionScope } from '@platform/authz';
  import {
    Button,
    Input,
    Label,
    ToggleGroup,
    ToggleGroupItem,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { RoleEntity } from '@base/features/roles/domain/entities/role.entity.ts';
  import { createRoleForm } from './role-form.state.svelte.ts';
  import {
    organizationIdOf,
    type RolesScope,
  } from '@base/features/roles/presentation/ui/components/roles-page.state.svelte.ts';
  import { scopeLabelOf } from '@base/features/roles/presentation/presenters/permission-label.presenter.ts';
  import { rolesMessages } from '@base/features/roles/presentation/messages/roles.messages.ts';
  import RolePermissions from './RolePermissions/RolePermissions.svelte';
  import RoleAccessField from './RoleAccessField.svelte';
  import RoleFormSection from './RoleFormSection.svelte';
  import RoleHolderField from './RoleHolderField.svelte';

  interface Props {
    /** `null` when creating. */
    role: RoleEntity | null;
    scope: RolesScope;
    onCancel: () => void;
    onSaved: () => void;
  }

  let { role, scope, onCancel, onSaved }: Props = $props();

  // Seeded once, deliberately: the page mounts this again for another role.
  // svelte-ignore state_referenced_locally
  const form = createRoleForm(role, organizationIdOf(scope));

  const organizationName = $derived(
    scope.kind === 'organization' ? scope.organizationName : null,
  );
  const lockedLabel = $derived(
    organizationName === null
      ? t(rolesMessages.notHeldAtSystem)
      : t(rolesMessages.notHeldIn(organizationName)),
  );

  const submit = async () => {
    if (!form.isValid) return;
    if (await form.submit()) onSaved();
  };
</script>

<div class="flex flex-col gap-5">
  <RoleFormSection
    id="role-general-title"
    title={t(rolesMessages.generalSection)}
    hint={t(rolesMessages.generalSectionHint)}
  >
    <div class="flex flex-col gap-1.5">
      <Label for="role-name">{t(rolesMessages.name)}</Label>
      <Input
        id="role-name"
        autofocus
        bind:value={form.name}
        disabled={form.isPending}
        placeholder={t(rolesMessages.namePlaceholder)}
      />
    </div>

    <div class="flex flex-col gap-1.5">
      <Label for="role-description">{t(rolesMessages.description)}</Label>
      <Input
        id="role-description"
        bind:value={form.description}
        disabled={form.isPending}
        placeholder={t(rolesMessages.descriptionPlaceholder)}
      />
    </div>
  </RoleFormSection>

  <RoleFormSection
    id="role-assignment-title"
    title={t(rolesMessages.assignmentSection)}
    hint={t(rolesMessages.assignmentSectionHint)}
  >
    <RoleHolderField
      kind={form.kind}
      fixed={form.isEdit}
      disabled={form.isPending}
      {organizationName}
      onKindChange={next => (form.kind = next)}
    />

    <div class="flex flex-col gap-1.5">
      <Label id="role-scope-label">{t(rolesMessages.scope)}</Label>
      <ToggleGroup
        type="single"
        variant="outline"
        class="w-full"
        aria-labelledby="role-scope-label"
        value={String(form.scope)}
        disabled={form.isEdit || form.isPending}
        onValueChange={value => {
          if (value) form.changeScope(Number(value) as PermissionScope);
        }}
      >
        {#each form.scopes as option (option)}
          <ToggleGroupItem value={String(option)} class="flex-1">
            {scopeLabelOf(option)}
          </ToggleGroupItem>
        {/each}
      </ToggleGroup>
      {#if form.isEdit}
        <p class="text-xs text-muted-foreground">{t(rolesMessages.scopeIsFixed)}</p>
      {/if}
    </div>
  </RoleFormSection>

  <RoleFormSection
    id="role-access-title"
    title={t(rolesMessages.access)}
    hint={t(rolesMessages.accessSectionHint)}
  >
    <RoleAccessField
      value={form.accessKind}
      canGiveFullControl={form.canGiveFullControl}
      disabled={form.isPending}
      onValueChange={next => (form.accessKind = next)}
    />

    {#if form.accessKind === 'restricted'}
      <RolePermissions
        scope={form.scope}
        permissions={form.permissions}
        preservedCount={form.preservedCount}
        conferredCount={form.conferredCount}
        isPending={form.isPending}
        lockedIds={form.lockedPermissions}
        {lockedLabel}
        onPermissionsChange={next => (form.permissions = next)}
      />
    {/if}
  </RoleFormSection>

  <div
    class="sticky bottom-0 z-10 -mx-1 flex flex-col-reverse gap-2 border-t bg-background/95 px-1 py-3 backdrop-blur sm:flex-row sm:justify-end"
  >
    <Button type="button" variant="outline" disabled={form.isPending} onclick={onCancel}>
      {t(rolesMessages.cancel)}
    </Button>
    <Button
      type="button"
      disabled={!form.isValid || form.isPending}
      onclick={() => void submit()}
    >
      {form.isEdit ? t(rolesMessages.saveChanges) : t(rolesMessages.createRole)}
    </Button>
  </div>
</div>
