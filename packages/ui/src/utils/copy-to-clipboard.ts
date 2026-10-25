import { toast } from 'svelte-sonner';
import { t } from '../i18n/lingui.adapter.svelte.ts';
import { clipboardMessages } from './clipboard.messages.ts';

export interface CopyToClipboardTexts {
  /** The toast of a copy, else a generic one. */
  copied?: string;
  /** The toast of a refused copy, else a generic one. */
  failed?: string;
}

/** The clipboard can be denied: a toast says what happened. True when the text was copied. */
export const copyToClipboard = async (
  text: string,
  texts: CopyToClipboardTexts = {},
): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(texts.copied ?? t(clipboardMessages.copied));
    return true;
  } catch {
    toast.error(texts.failed ?? t(clipboardMessages.copyFailed));
    return false;
  }
};
