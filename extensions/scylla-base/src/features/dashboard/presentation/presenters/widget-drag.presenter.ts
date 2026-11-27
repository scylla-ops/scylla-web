import { t } from '@scylla/ui/i18n';
import { editorMessages } from '@base/features/dashboard/presentation/messages/editor.messages.ts';

export interface WidgetDragNewsInput {
  drag: { label: string; from: 'grid' | 'palette'; keyboard?: boolean } | null;
  /** The index where the drag lands; null for a kind out of the grid. */
  over: number | null;
  /** The drag goes to a new place. */
  moved: boolean;
  /** The widgets of the draft. */
  count: number;
  /** The end of the last drag. `at`: the new index; null: no move. */
  ended: { label: string; at: number | null } | null;
}

/** The text of the live region of the edit mode: the lift, each place, then the drop or the cancel. */
export const widgetDragNews = ({
  drag,
  over,
  moved,
  count,
  ended,
}: WidgetDragNewsInput): string => {
  if (drag) {
    if (over === null) return '';
    const total = drag.from === 'palette' ? count + 1 : count;
    if (moved) return t(editorMessages.widgetPlace(drag.label, over + 1, total));
    return t(
      drag.keyboard
        ? editorMessages.widgetLifted(drag.label, over + 1, total)
        : editorMessages.widgetPicked(drag.label, over + 1, total),
    );
  }
  if (!ended) return '';
  return ended.at === null
    ? t(editorMessages.widgetBack(ended.label))
    : t(editorMessages.widgetDropped(ended.label, ended.at + 1, count));
};
