<script lang="ts">
  import { untrack } from 'svelte';
  import { Button, Dialog, DialogContent, DialogTitle, Input } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { editorMessages as messages } from '@base/features/dashboard/presentation/messages/editor.messages.ts';

  interface Props {
    name: string;
    onRename: (name: string) => void;
    onClose: () => void;
  }

  let { name: first, onRename, onClose }: Props = $props();

  let name = $state(untrack(() => first));
</script>

<Dialog open onOpenChange={open => !open && onClose()}>
  <DialogContent class="max-w-sm">
    <form
      class="flex flex-col gap-4"
      onsubmit={event => {
        event.preventDefault();
        if (name.trim()) onRename(name);
      }}
    >
      <DialogTitle>{t(messages.rename)}</DialogTitle>
      <Input aria-label={t(messages.name)} bind:value={name} />
      <div class="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onclick={onClose}>{t(messages.cancel)}</Button>
        <Button type="submit" size="sm" disabled={!name.trim()}>{t(messages.rename)}</Button>
      </div>
    </form>
  </DialogContent>
</Dialog>
