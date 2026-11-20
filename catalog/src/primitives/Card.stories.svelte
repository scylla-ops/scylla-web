<script module lang="ts">
  import {
    Button,
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'Primitives/Card',
    component: Card,
    subcomponents: { CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter },
  });
</script>

<Story name="All parts" asChild>
  <Card class="max-w-md">
    <CardHeader>
      <CardTitle>Deploy keys</CardTitle>
      <CardDescription>Keys that can push to this project.</CardDescription>
      <CardAction><Button variant="outline" size="sm">Add</Button></CardAction>
    </CardHeader>
    <CardContent>
      <p class="text-sm text-muted-foreground">No key yet.</p>
    </CardContent>
    <CardFooter class="justify-end gap-2">
      <Button variant="ghost">Cancel</Button>
      <Button>Save</Button>
    </CardFooter>
  </Card>
</Story>

<Story name="Title only" asChild>
  <Card class="max-w-md">
    <CardHeader><CardTitle>Usage</CardTitle></CardHeader>
    <CardContent><p class="text-sm">12 runs this week.</p></CardContent>
  </Card>
</Story>
