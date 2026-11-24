<script lang="ts">
  import { createMutation } from '@scylla/core-sdk';
  import { userMutations } from '@base/features/user/presentation/user.queries.ts';
  import DeleteAccountDialog from '../DeleteAccountDialog/DeleteAccountDialog.svelte';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }

  let { open, onOpenChange }: Props = $props();

  // On success the mutation signs out: see `userMutations.deleteAccount`.
  const deletion = createMutation(() => userMutations.deleteAccount());

  /** A refusal stays for this opening only. */
  const change = (next: boolean) => {
    if (!next) deletion.reset();
    onOpenChange(next);
  };
</script>

<!-- The deletion of the own account outside the account page: the export is out of reach. -->
<DeleteAccountDialog
  {open}
  onOpenChange={change}
  isPending={deletion.isPending}
  refusal={deletion.data ?? undefined}
  onConfirm={password => deletion.mutate(password)}
  withExportLink={false}
/>
