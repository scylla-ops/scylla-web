<script lang="ts">
  import LockIcon from '@lucide/svelte/icons/lock';
  import { OriginTag } from '@base/features/roles';
  import { t } from '@scylla/ui/i18n';
  import { Button, Checkbox } from '@scylla/ui/primitives';
  import { membershipMessages } from '../../../messages/membership.messages.ts';
  import type { RoleChoice } from '../../../presenters/role-choices.presenter.ts';

  interface Props {
    choice: RoleChoice;
    /** The state to show: during a save, the state that the click asked for. */
    checked: boolean;
    /** Another change runs. The box keeps the focus and ignores a click. */
    busy: boolean;
    /** What the change does, when it asks first. */
    warning: string | null;
    /** The text of the button that confirms the warning. */
    confirmLabel: string;
    failure: string | null;
    onToggle: () => void;
    onKeep: () => void;
    onConfirm: () => void;
  }

  let { choice, checked, busy, warning, confirmLabel, failure, onToggle, onKeep, onConfirm }: Props =
    $props();

  const hintId = $props.id();
</script>

<li class="rounded-xl border {checked ? 'border-primary' : ''}">
  <label
    class="flex gap-3 rounded-xl p-3 transition-colors {choice.locked
      ? 'cursor-not-allowed'
      : 'cursor-pointer hover:bg-muted/40'}"
  >
    <Checkbox
      bind:checked={() => checked, onToggle}
      readonly={busy}
      disabled={choice.locked}
      aria-label={choice.name}
      aria-describedby={choice.hint ? hintId : undefined}
      class="mt-0.5 transition-opacity data-readonly:opacity-50 data-readonly:delay-150"
    />
    <span class="flex min-w-0 flex-1 flex-col gap-1">
      <span class="flex items-center gap-2 text-sm font-medium">
        {choice.name}
        {#if choice.custom}
          <OriginTag builtin={false} />
        {/if}
        {#if choice.locked}
          <LockIcon class="ml-auto size-3.5 shrink-0 text-muted-foreground" />
        {/if}
      </span>
      {#if choice.hint}
        <span id={hintId} class="text-xs text-muted-foreground">{choice.hint}</span>
      {/if}
    </span>
  </label>
  {#if warning}
    <div class="flex flex-col gap-2 border-t p-3">
      <p class="text-xs">{warning}</p>
      <div class="flex justify-end gap-2">
        <Button variant="outline" size="sm" onclick={onKeep}>{t(membershipMessages.keep)}</Button>
        <Button variant="destructive" size="sm" onclick={onConfirm}>{confirmLabel}</Button>
      </div>
    </div>
  {/if}
  {#if failure}
    <p class="border-t px-3 py-2 text-sm text-destructive" role="alert">{failure}</p>
  {/if}
</li>
