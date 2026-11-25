<script module lang="ts">
  import { ShareLinkButton } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const HINT = 'Only members of Acme with access can open it.';

  const { Story } = defineMeta({
    title: 'Controls/ShareLinkButton',
    component: ShareLinkButton,
    args: { hint: HINT },
    argTypes: { url: { control: false } },
  });
</script>

<!-- A click copies the address of the page: the check shows for 2 s, and a toast tells it. -->
<Story name="Playground" />

<Story name="States" asChild>
  <div class="flex flex-wrap items-end gap-8">
    <Specimen label="default"><ShareLinkButton hint={HINT} /></Specimen>
    <Specimen label="hover" state="hover"><ShareLinkButton hint={HINT} /></Specimen>
    <Specimen label="focus" state="focus"><ShareLinkButton hint={HINT} /></Specimen>
  </div>
</Story>
