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

/** The value of a select with no filter. */
export const ALL = 'all';

export type NotificationsTab = 'inbox' | 'done';

export interface PageFilters {
  tab: NotificationsTab;
  unreadOnly: boolean;
  needsActionOnly: boolean;
  workspaceId: string;
  category: string;
}

const NO_FILTERS: Omit<PageFilters, 'tab'> = {
  unreadOnly: false,
  needsActionOnly: false,
  workspaceId: ALL,
  category: ALL,
};

/** Construct it during component initialisation: `createQuery` needs an owner. */
export class NotificationsPageState {
  public filters = $state<PageFilters>({ tab: 'inbox', ...NO_FILTERS });
  public readonly selected = new SvelteSet<string>();
  public activeIndex = $state(0);
  /** The token of each page up to the one on the screen. */
  private tokens = $state<string[]>(['']);

  private readonly filter = $derived<NotificationFilter>({
    done: this.filters.tab === 'done',
    unreadOnly: this.filters.unreadOnly,
    needsActionOnly: this.filters.needsActionOnly,
    workspaceId: this.filters.workspaceId === ALL ? null : this.filters.workspaceId,
    category: this.filters.category === ALL ? '' : this.filters.category,
  });

  private readonly list = createQuery(() =>
    notificationQueries.list(this.filter, PAGE_SIZE, this.tokens.at(-1) ?? ''),
  );
  private readonly read = createMutation(() => notificationMutations.markRead());
  private readonly done = createMutation(() => notificationMutations.setDone());

  constructor(private readonly slug: () => string | null) {}

  get rows(): readonly NotificationEntity[] {
    return this.list.data?.items ?? [];
  }

  get isLoading(): boolean {
    return this.list.isLoading;
  }

  get isError(): boolean {
    return this.list.isError;
  }

  get filtered(): boolean {
    const { unreadOnly, needsActionOnly, workspaceId, category } = this.filters;
    return unreadOnly || needsActionOnly || workspaceId !== ALL || category !== ALL;
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

  /** Changes a filter, and goes back to the first page. */
  update = (change: Partial<PageFilters>): void => {
    this.filters = { ...this.filters, ...change };
    this.toFirstPage();
  };

  clearFilters = (): void => this.update(NO_FILTERS);

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

  private toFirstPage(): void {
    this.tokens = [''];
    this.resetRows();
  }

  private resetRows(): void {
    this.selected.clear();
    this.activeIndex = 0;
  }
}
