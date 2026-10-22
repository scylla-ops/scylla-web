<script lang="ts">
  import {
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { rolesMessages } from '@base/features/roles/presentation/ui/roles.messages.ts';
  import type { AccessKind } from './role-form.state.svelte.ts';

  interface Props {
    value: AccessKind;
    /** The author does not hold full control: offered, never selectable. */
    canGiveFullControl: boolean;
    disabled: boolean;
    onValueChange: (value: AccessKind) => void;
  }

  let { value, canGiveFullControl, disabled, onValueChange }: Props = $props();
</script>

<div class="flex flex-col gap-1.5">
  <Label for="role-access">{t(rolesMessages.accessLevel)}</Label>
  <!-- `items` names the closed value: without it the trigger shows the raw key. -->
  <Select
    type="single"
    items={[
      { value: 'fullControl', label: t(rolesMessages.fullControl) },
      { value: 'restricted', label: t(rolesMessages.restricted) },
    ]}
    {value}
    {disabled}
    onValueChange={next => onValueChange(next as AccessKind)}
  >
    <SelectTrigger id="role-access" class="w-full">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem
        value="fullControl"
        label={t(rolesMessages.fullControl)}
        disabled={!canGiveFullControl}
      >
        {t(rolesMessages.fullControl)}
      </SelectItem>
      <SelectItem value="restricted" label={t(rolesMessages.restricted)}>
        {t(rolesMessages.restricted)}
      </SelectItem>
    </SelectContent>
  </Select>
  {#if !canGiveFullControl}
    <p class="text-xs text-muted-foreground">{t(rolesMessages.fullControlNotHeld)}</p>
  {/if}
</div>
