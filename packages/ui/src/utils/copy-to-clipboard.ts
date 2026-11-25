import { toast } from 'svelte-sonner';
import { t } from '../i18n/lingui.adapter.svelte.ts';
import { clipboardMessages } from './clipboard.messages.ts';

export interface CopyToClipboardTexts {
  /** The toast of a copy, else a generic one. */
  copied?: string;
  /** The toast of a refused copy, else a generic one. */
  failed?: string;
  /** The second line of each toast, e.g. what to do when the copy is refused. */
  description?: { copied?: string; failed?: string };
}

const show = (kind: 'success' | 'error', message: string, description?: string) => {
  if (description) toast[kind](message, { description });
  else toast[kind](message);
};

/** The clipboard can be denied: a toast says what happened. True when the text was copied. */
export const copyToClipboard = async (
  text: string,
  texts: CopyToClipboardTexts = {},
): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    show('success', texts.copied ?? t(clipboardMessages.copied), texts.description?.copied);
    return true;
  } catch {
    show('error', texts.failed ?? t(clipboardMessages.copyFailed), texts.description?.failed);
    return false;
  }
};
