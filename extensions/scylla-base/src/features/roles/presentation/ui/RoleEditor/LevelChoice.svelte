<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { RoleLevel } from '../../../domain/entities/role.entity.ts';
  import { levelHints, levelLabels, rolesMessages } from '../../messages/roles.messages.ts';
  import { LEVEL_TONES } from '../../presenters/role-level.presenter.ts';
  import LevelTile from '../components/LevelTile.svelte';

  interface Props {
    levels: readonly RoleLevel[];
    value: RoleLevel;
    /** No level changes: someone holds the role. */
    locked: boolean;
    isOff: (level: RoleLevel) => boolean;
    onChoose: (level: RoleLevel) => void;
  }

  let { levels, value, locked, isOff, onChoose }: Props = $props();
</script>

<fieldset class="flex flex-col gap-2" disabled={locked}>
  <legend class="mb-2 text-sm font-medium">{t(rolesMessages.level)}</legend>
  {#each levels as option (option)}
    {@const chosen = value === option}
    {@const off = isOff(option)}
    {@const tone = LEVEL_TONES[option]}
    <button
      type="button"
      role="radio"
      aria-checked={chosen}
      disabled={off}
      class={cn(
        'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors',
        chosen && ['border-[1.5px] p-[11.5px]', tone.border, tone.tint],
        off ? 'cursor-not-allowed opacity-60' : !chosen && 'hover:bg-muted/40',
      )}
      onclick={() => onChoose(option)}
    >
      <LevelTile level={option} class="size-8 rounded-[9px]" />
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-medium">{t(levelLabels[option])}</span>
        <span class="block text-xs text-muted-foreground">{t(levelHints[option])}</span>
      </span>
      <span
        class={cn(
          'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border',
          chosen ? ['border-[1.5px]', tone.border] : 'border-input',
        )}
      >
        {#if chosen}
          <span class={cn('size-2 rounded-full', tone.bar)}></span>
        {/if}
      </span>
    </button>
  {/each}
  <p class="text-xs text-muted-foreground">{t(rolesMessages.levelHint)}</p>
</fieldset>
