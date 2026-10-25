import { toast } from 'svelte-sonner';
import { t } from '../i18n/lingui.adapter.svelte.ts';
import { clipboardMessages } from './clipboard.messages.ts';

/** The clipboard can be denied: a toast says what happened. */
export const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(t(clipboardMessages.copied));
  } catch {
    toast.error(t(clipboardMessages.copyFailed));
  }
};
