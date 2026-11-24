<script module lang="ts">
  import { Widget, WidgetGrid, WidgetState, type WidgetSize, type WidgetStateKind } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const STATES: WidgetStateKind[] = ['loading', 'error', 'empty', 'all-clear', 'locked', 'missing'];
  const ACTIONS: Partial<Record<WidgetStateKind, string>> = { error: 'Retry', missing: 'Choose data' };

  const actionOf = (state: WidgetStateKind) => {
    const label = ACTIONS[state];
    return label ? { label, onSelect: () => {} } : undefined;
  };

  const { Story } = defineMeta({ title: 'Widget/WidgetState', component: WidgetState });
</script>

{#snippet states(size: WidgetSize)}
  <Specimen label={`size ${size}`} class="w-full max-w-5xl">
    <WidgetGrid class="w-full">
      {#each STATES as state (state)}
        <Widget {size} title={state}>
          <WidgetState {state} {size} action={actionOf(state)} />
        </Widget>
      {/each}
    </WidgetGrid>
  </Specimen>
{/snippet}

<Story name="Size xs" asChild>{@render states('xs')}</Story>
<Story name="Size s" asChild>{@render states('s')}</Story>
<Story name="Size m" asChild>{@render states('m')}</Story>
<Story name="Size l" asChild>{@render states('l')}</Story>

<Story name="Retry time and missing permission" asChild>
  <Specimen label="error with the time of the next read, locked with the permission" class="w-full max-w-5xl">
    <WidgetGrid class="w-full">
      <Widget size="m" title="Success rate">
        <WidgetState state="error" size="m" retrySeconds={60} action={actionOf('error')} />
      </Widget>
      <Widget size="m" title="Capacity">
        <WidgetState state="locked" size="m" permission="Agents · View" />
      </Widget>
    </WidgetGrid>
  </Specimen>
</Story>

<Story name="Texts of the caller" asChild>
  <Specimen label="empty, with the texts of a widget" class="w-full max-w-xl">
    <WidgetGrid class="w-full">
      <Widget size="m" title="Success rate">
        <WidgetState
          state="empty"
          size="m"
          title="No jobs in this period"
          description="Change the period or the scope of the widget."
        />
      </Widget>
    </WidgetGrid>
  </Specimen>
</Story>
