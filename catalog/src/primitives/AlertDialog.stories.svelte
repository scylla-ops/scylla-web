<script module lang="ts">
  import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogOverlay,
    AlertDialogPortal,
    AlertDialogTitle,
    AlertDialogTrigger,
    Button,
  } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'Primitives/AlertDialog',
    component: AlertDialog,
    // `AlertDialogContent` puts itself in an `AlertDialogPortal`, over an `AlertDialogOverlay`.
    subcomponents: {
      AlertDialogTrigger,
      AlertDialogPortal,
      AlertDialogOverlay,
      AlertDialogContent,
      AlertDialogHeader,
      AlertDialogTitle,
      AlertDialogDescription,
      AlertDialogFooter,
      AlertDialogCancel,
      AlertDialogAction,
    },
    parameters: { layout: 'fullscreen' },
  });
</script>

<Story name="Destructive" asChild>
  <AlertDialog open>
    <AlertDialogTrigger>
      {#snippet child({ props })}<Button variant="destructive" {...props}>Delete</Button>{/snippet}
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete the pipeline?</AlertDialogTitle>
        <AlertDialogDescription>Its runs and its logs go too. You cannot undo this.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction variant="destructive">Delete</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</Story>

<Story name="Default" asChild>
  <AlertDialog open>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Reactivate the user?</AlertDialogTitle>
        <AlertDialogDescription>The user can sign in again.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction>Reactivate</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</Story>
