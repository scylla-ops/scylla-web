import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { flushSync } from 'svelte';
import { findFloating, render } from '@test/render.ts';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import JobActions from './JobActions.svelte';

/** Captures the observer's callback so a test can report a width. */
class ResizeObserverMock {
  static instances: ResizeObserverMock[] = [];
  callback: (entries: Array<{ contentRect: { width: number } }>) => void;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(callback: (entries: Array<{ contentRect: { width: number } }>) => void) {
    this.callback = callback;
    ResizeObserverMock.instances.push(this);
  }

  fire(width: number) {
    this.callback([{ contentRect: { width } }]);
    flushSync();
  }
}

const fullControl = () =>
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
    },
  });

beforeEach(() => {
  ResizeObserverMock.instances = [];
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  fullControl();
});

afterEach(() => permissionsStore.setState({ permissions: null }));

describe('JobActions', () => {
  it('in the wide layout, shows a view action next to delete', () => {
    render(JobActions, { onView: vi.fn(), onDelete: vi.fn() });

    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument();
  });

  it('hides the delete button without DELETE_JOB', () => {
    permissionsStore.setState({ permissions: { scopes: [] } });
    render(JobActions, { onView: vi.fn(), onDelete: vi.fn() });

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument();
  });

  it('collapses into a single, named dropdown trigger once the column is too narrow', () => {
    render(JobActions, { onView: vi.fn(), onDelete: vi.fn() });

    ResizeObserverMock.instances[0].fire(50);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Job actions' })).toBeInTheDocument();
  });

  it('the collapsed menu forwards a pick to the matching handler and no other', async () => {
    const onView = vi.fn();
    const onDelete = vi.fn();
    render(JobActions, { onView, onDelete });

    ResizeObserverMock.instances[0].fire(50);
    await userEvent.click(screen.getByRole('button', { name: 'Job actions' }));
    await userEvent.click(await findFloating('menuitem', 'View'));

    expect(onView).toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('the collapsed menu omits delete without DELETE_JOB', async () => {
    permissionsStore.setState({ permissions: { scopes: [] } });
    render(JobActions, { onView: vi.fn(), onDelete: vi.fn() });

    ResizeObserverMock.instances[0].fire(50);
    await userEvent.click(screen.getByRole('button', { name: 'Job actions' }));

    expect(await findFloating('menuitem', 'View')).toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('shows a re-run action next to view when the job ended and the user may run the pipeline', async () => {
    const onRerun = vi.fn();
    render(JobActions, { onView: vi.fn(), onDelete: vi.fn(), onRerun });

    expect(screen.getAllByRole('button')).toHaveLength(3);
    await userEvent.click(screen.getByRole('button', { name: 'Re-run' }));

    expect(onRerun).toHaveBeenCalled();
  });

  it('disables the re-run action while a re-run is pending, so a second click starts nothing', async () => {
    const onRerun = vi.fn();
    render(JobActions, { onView: vi.fn(), onDelete: vi.fn(), onRerun, isRerunning: true });

    const rerun = screen.getByRole('button', { name: 'Re-run' });
    expect(rerun).toBeDisabled();
    await userEvent.click(rerun);

    expect(onRerun).not.toHaveBeenCalled();
  });

  it('hides the re-run action without RUN_PIPELINE', () => {
    permissionsStore.setState({
      permissions: {
        scopes: [
          {
            scope: PermissionScope.SYSTEM,
            scopeId: '',
            access: { kind: 'restricted', permissions: [Permission.DELETE_JOB] },
          },
        ],
      },
    });
    render(JobActions, { onView: vi.fn(), onDelete: vi.fn(), onRerun: vi.fn() });

    expect(screen.queryByRole('button', { name: 'Re-run' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('offers no re-run for a job that has not ended', () => {
    render(JobActions, { onView: vi.fn(), onDelete: vi.fn() });

    expect(screen.queryByRole('button', { name: 'Re-run' })).not.toBeInTheDocument();
  });

  it('the collapsed menu forwards a re-run pick', async () => {
    const onRerun = vi.fn();
    render(JobActions, { onView: vi.fn(), onDelete: vi.fn(), onRerun });

    ResizeObserverMock.instances[0].fire(50);
    await userEvent.click(screen.getByRole('button', { name: 'Job actions' }));
    await userEvent.click(await findFloating('menuitem', 'Re-run'));

    expect(onRerun).toHaveBeenCalled();
  });
});
