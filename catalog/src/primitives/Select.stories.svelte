<script module lang="ts">
  import {
    Select,
    SelectContent,
    SelectGroup,
    SelectGroupHeading,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const PLANS = [
    { value: 'free', label: 'Free' },
    { value: 'pro', label: 'Pro' },
    { value: 'team', label: 'Team' },
  ];

  const { Story } = defineMeta({
    title: 'Primitives/Select',
    component: Select,
    subcomponents: {
      SelectTrigger,
      SelectValue,
      SelectContent,
      SelectGroup,
      SelectGroupHeading,
      SelectItem,
    },
  });
</script>

{#snippet options()}
  {#each PLANS as plan (plan.value)}
    <SelectItem value={plan.value} label={plan.label}>{plan.label}</SelectItem>
  {/each}
{/snippet}

<Story name="Trigger" asChild>
  <div class="grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-3">
    <Specimen label="placeholder" class="w-48">
      <Select type="single">
        <SelectTrigger class="w-full"><SelectValue placeholder="Pick a plan" /></SelectTrigger>
        <SelectContent>{@render options()}</SelectContent>
      </Select>
    </Specimen>
    <Specimen label="value" class="w-48">
      <Select type="single" value="pro">
        <SelectTrigger class="w-full">Pro</SelectTrigger>
        <SelectContent>{@render options()}</SelectContent>
      </Select>
    </Specimen>
    <Specimen label="size sm" class="w-48">
      <Select type="single" value="pro">
        <SelectTrigger size="sm" class="w-full">Pro</SelectTrigger>
        <SelectContent>{@render options()}</SelectContent>
      </Select>
    </Specimen>
    <Specimen label="hover" state="hover" class="w-48">
      <Select type="single" value="pro">
        <SelectTrigger class="w-full">Pro</SelectTrigger>
        <SelectContent>{@render options()}</SelectContent>
      </Select>
    </Specimen>
    <Specimen label="focus" state="focus" class="w-48">
      <Select type="single" value="pro">
        <SelectTrigger class="w-full">Pro</SelectTrigger>
        <SelectContent>{@render options()}</SelectContent>
      </Select>
    </Specimen>
    <Specimen label="disabled" class="w-48">
      <Select type="single" value="pro" disabled>
        <SelectTrigger class="w-full">Pro</SelectTrigger>
        <SelectContent>{@render options()}</SelectContent>
      </Select>
    </Specimen>
    <Specimen label="invalid" class="w-48">
      <Select type="single">
        <SelectTrigger class="w-full" aria-invalid="true">
          <SelectValue placeholder="Pick a plan" />
        </SelectTrigger>
        <SelectContent>{@render options()}</SelectContent>
      </Select>
    </Specimen>
  </div>
</Story>

<Story name="Open, with groups" asChild>
  <div class="h-72 w-56">
    <Select type="single" value="pro" open>
      <SelectTrigger class="w-full">Pro</SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectGroupHeading>Plans</SelectGroupHeading>
          {@render options()}
        </SelectGroup>
        <SelectGroup>
          <SelectGroupHeading>Other</SelectGroupHeading>
          <SelectItem value="enterprise" label="Enterprise" disabled>Enterprise</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  </div>
</Story>
