<script module lang="ts">
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({
    title: 'Primitives/Tabs',
    component: Tabs,
    subcomponents: { TabsList, TabsTrigger, TabsContent },
  });
</script>

<Story name="Tabs" asChild>
  <Tabs value="runs" class="max-w-md">
    <TabsList>
      <TabsTrigger value="runs">Runs</TabsTrigger>
      <TabsTrigger value="logs">Logs</TabsTrigger>
      <TabsTrigger value="settings" disabled>Settings</TabsTrigger>
    </TabsList>
    <TabsContent value="runs"><p class="text-sm">The last runs of the pipeline.</p></TabsContent>
    <TabsContent value="logs"><p class="text-sm">The logs of the last run.</p></TabsContent>
  </Tabs>
</Story>

<Story name="Trigger states" asChild>
  <div class="flex flex-wrap items-end gap-8">
    <Specimen label="hover" state="hover">
      <Tabs value="a">
        <TabsList><TabsTrigger value="a">Selected</TabsTrigger><TabsTrigger value="b">Other</TabsTrigger></TabsList>
      </Tabs>
    </Specimen>
    <Specimen label="focus" state="focus">
      <Tabs value="a">
        <TabsList><TabsTrigger value="a">Selected</TabsTrigger><TabsTrigger value="b">Other</TabsTrigger></TabsList>
      </Tabs>
    </Specimen>
  </div>
</Story>
