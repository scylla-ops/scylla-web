<script module lang="ts">
  import { TruncatedText } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Data display/TruncatedText', component: TruncatedText });
</script>

<Story name="Cases" asChild>
  <div class="flex flex-wrap items-end gap-10">
    <Specimen label="fits" class="w-48">
      <TruncatedText class="w-48">build</TruncatedText>
    </Specimen>
    <Specimen label="cut (hover for the full text)" class="w-48">
      <TruncatedText class="w-48">deploy-to-production-europe-west-1</TruncatedText>
    </Specimen>
    <Specimen label="own tooltip" class="w-48">
      <TruncatedText class="w-48" tooltip="The pipeline that deploys to Europe">
        deploy-to-production-europe-west-1
      </TruncatedText>
    </Specimen>
  </div>
</Story>
