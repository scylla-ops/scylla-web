import { navigateTo } from '@platform/context';
import { createMutation, createQuery } from '@scylla/core-sdk';
import { SvelteSet } from 'svelte/reactivity';
import type {
  NotificationEntity,
  NotificationFilter,
} from '../../../domain/entities/notification.entity.ts';
import { notificationMutations, notificationQueries } from '../../notifications.queries.ts';
import { viewOfRow } from '../../presenters/kind-views.ts';
import { pageKey } from '../../presenters/page-keys.ts';

const PAGE_SIZE = 25;

/** No row is active until a key moves to one. */
const NO_ROW = -1;

/**
 * One list, on its pages. A new filter needs a new state: it starts on its first page, with no
 * selection. Construct it during component initialisation: `createQuery` needs an owner.
 */
export class NotificationsPageState {
  public readonly selected = new SvelteSet<string>();
  public activeIndex = $state(NO_ROW);
  /** The token of each page up to the one on the screen. */
  private tokens = $state<string[]>(['']);

  private readonly list;
  private readonly read = createMutation(() => notificationMutations.markRead());
  private readonly done = createMutation(() => notificationMutations.setDone());

  constructor(
    filter: () => NotificationFilter,
    private readonly slug: () => string | null,
  ) {
    this.list = createQuery(() =>
      notificationQueries.list(filter(), PAGE_SIZE, this.tokens.at(-1) ?? ''),
    );
  }

  get rows(): readonly NotificationEntity[] {
    return this.list.data?.items ?? [];
  }

  get isLoading(): boolean {
    return this.list.isLoading;
  }

  get isError(): boolean {
    return this.list.isError;
  }

  get hasPrevious(): boolean {
    return this.tokens.length > 1;
  }

  get hasNext(): boolean {
    return !!this.list.data?.nextToken;
  }

  get activeId(): string | null {
    return this.rows[this.activeIndex]?.id ?? null;
  }

  get allSelected(): boolean {
    return this.rows.length > 0 && this.rows.every(row => this.selected.has(row.id));
  }

  retry = (): void => {
    void this.list.refetch();
  };

  nextPage = (): void => {
    const token = this.list.data?.nextToken;
    if (!token) return;
    this.tokens = [...this.tokens, token];
    this.resetRows();
  };

  previousPage = (): void => {
    if (!this.hasPrevious) return;
    this.tokens = this.tokens.slice(0, -1);
    this.resetRows();
  };

  toggle = (id: string): void => {
    if (!this.selected.delete(id)) this.selected.add(id);
  };

  toggleAll = (): void => {
    const select = !this.allSelected;
    this.selected.clear();
    if (select) this.rows.forEach(row => this.selected.add(row.id));
  };

  markSelected = (read: boolean): void => {
    this.read.mutate({ ids: [...this.selected], read });
    this.selected.clear();
  };

  setSelectedDone = (done: boolean): void => {
    this.done.mutate({ ids: [...this.selected], done });
    this.selected.clear();
  };

  onKey = (event: KeyboardEvent): void => {
    const action = pageKey(event);
    if (!action) return;
    if (action === 'next' || action === 'previous') {
      event.preventDefault();
      this.move(action === 'next' ? 1 : -1);
      return;
    }
    const row = this.rows[this.activeIndex];
    if (!row) return;
    event.preventDefault();
    if (action === 'open') this.open(row);
    if (action === 'read' && !row.needsAction) {
      this.read.mutate({ ids: [row.id], read: !row.read });
    }
    if (action === 'done') this.done.mutate({ ids: [row.id], done: !row.done });
    if (action === 'select') this.toggle(row.id);
  };

  private move(step: number): void {
    const last = Math.max(this.rows.length - 1, 0);
    this.activeIndex = Math.min(Math.max(this.activeIndex + step, 0), last);
  }

  private open(row: NotificationEntity): void {
    const { href } = viewOfRow(row, this.slug());
    if (!href) return;
    if (!row.read && !row.needsAction) this.read.mutate({ ids: [row.id], read: true });
    navigateTo(href);
  }

  private resetRows(): void {
    this.selected.clear();
    this.activeIndex = NO_ROW;
  }
}
