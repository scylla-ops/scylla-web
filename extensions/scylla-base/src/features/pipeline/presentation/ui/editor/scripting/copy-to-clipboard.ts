import { t } from '@scylla/ui/i18n';
import { toast } from '@scylla/ui/utils';
import { scriptingMessages } from './scripting.messages.ts';

/** The clipboard can be denied: a toast says what happened. */
export const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(t(scriptingMessages.copied));
  } catch {
    toast.error(t(scriptingMessages.copyFailed));
  }
};
