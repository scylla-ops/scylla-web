import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { findFloating, render, withQueryClient, withRegistry } from '@test/render.ts';
import { installTestNavigator } from '@test/navigator.ts';
import { contextStore } from '@platform/context';
import { Permission, permissionsStore, PermissionScope } from '@platform/authz';
import type { ProjectGroupEntity } from '@base/features/project/domain/entities/project-group.entity.ts';
import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
import type { ProjectGroupRepository } from '@base/features/project/domain/repository/project-group.repository.ts';
import type { ProjectRepository } from '@base/features/project/domain/repository/project.repository.ts';
import type {
  ProjectSearch,
  ProjectSearchResult,
} from '@base/features/project/domain/structs/project-search.struct.ts';
import { PROJECT_PINS_KEY, PROJECT_SECTIONS_KEY } from '../../project-layout.user-state.ts';
import { PROJECT_DENSITY_KEY } from '../../project-density.user-state.ts';
import { REORDER_LIMIT } from '../../presenters/project-sections.presenter.ts';
import ProjectList from '../ProjectList.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const project = (name: string, groupId?: string): ProjectEntity => ({
  id: `id-${name}`,
  workspaceId: 'org-1',
  name,
  description: '',
  ...(groupId && { groupId }),
});

/** "web" and "api" in the group "Deploys"; "docs", "cli" and "status" in no group. */
const ALL = [
  project('web', 'g-1'),
  project('api', 'g-1'),
  project('docs'),
  project('cli'),
  project('status'),
];
const DEPLOYS: ProjectGroupEntity = {
  id: 'g-1',
  workspaceId: 'org-1',
  name: 'Deploys',
  color: 'chart-3',
};

let teardown: Array<() => void> = [];
let search: ReturnType<typeof vi.fn<(input: ProjectSearch) => Promise<ProjectSearchResult>>>;
let groups: { [K in keyof ProjectGroupRepository]: ReturnType<typeof vi.fn> };

beforeEach(() => {
  contextStore.setState({
    workspace: { id: 'org-1', name: 'Acme', slug: null },
    project: { id: null, name: null },
  });
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
    },
  });
  search = vi.fn(({ section, projectIds, limit }: ProjectSearch) => {
    const found = ALL.filter(
      item =>
        (!projectIds?.length || projectIds.includes(item.id)) &&
        (section?.kind !== 'group' || item.groupId === section.groupId) &&
        (section?.kind !== 'ungrouped' || !item.groupId),
    );
    const failed = section?.kind === 'group' ? 1 : 0;
    return Promise.resolve({
      items: found.slice(0, limit),
      counts: { total: found.length, failed, running: 0, pipelines: 0 },
      hasMore: found.length > limit,
    });
  });
  groups = {
    list: vi.fn(() => Promise.resolve([DEPLOYS])),
    create: vi.fn((_: string, name: string, color?: string) =>
      Promise.resolve({ id: 'g-2', workspaceId: 'org-1', name, ...(color && { color }) }),
    ),
    update: vi.fn((id: string, change: Partial<ProjectGroupEntity>) =>
      Promise.resolve({ ...DEPLOYS, id, ...change }),
    ),
    reorder: vi.fn(),
    delete: vi.fn(),
    move: vi.fn(({ id }: { id: string }) => Promise.resolve(ALL.find(item => item.id === id))),
  };
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({
      project: {
        projectRepository: { search } as unknown as ProjectRepository,
        projectGroupRepository: groups as unknown as ProjectGroupRepository,
      },
    }),
    installTestNavigator({ pathname: '/acme/projects' }).restore,
  ];
  // The parts of the reorder mode come and go with a transition: with reduced motion, at once.
  // jsdom never ends an animation (`test/setup.ts`).
  const media = window.matchMedia;
  window.matchMedia = vi.fn((query: string) => ({
    ...media(query),
    matches: query === '(prefers-reduced-motion: reduce)',
  }));
});

afterEach(() => {
  teardown.forEach(restore => restore());
  localStorage.clear();
});

const section = (name: string) => screen.getByRole('region', { name });
const cardsOf = (name: string) =>
  [...section(name).querySelectorAll('[data-tour="project-card"]')].map(card =>
    card.getAttribute('data-project-id'),
  );
/** « New group » of the header of the page: the end of the page and « No group » have one too. */
const newGroupOfHeader = () => screen.getAllByRole('button', { name: 'New group' })[0];
const headerOf = (name: string, expanded = true) =>
  within(section(name)).getByRole('button', { expanded, name: new RegExp(`^${name}`) });

/**
 * A button of a popover, by its label or its text. The floating layer is not placed in jsdom: it
 * stays hidden, and the role queries give no name to its buttons.
 */
const floatingButton = (name: string) =>
  waitFor(() => {
    const found = [...document.querySelectorAll('[data-popover-content] button')].find(
      button => button.getAttribute('aria-label') === name || button.textContent?.trim() === name,
    );
    expect(found).toBeDefined();
    return found as HTMLElement;
  });

const openMenuOf = async (name: string, sectionName: string) => {
  const card = await waitFor(() => {
    const found = section(sectionName).querySelector(`[data-project-id="id-${name}"]`);
    expect(found).not.toBeNull();
    return found as HTMLElement;
  });
  await userEvent.click(within(card).getByRole('button', { name: 'Project menu' }));
};

describe('the sections of the projects page', () => {
  it('shows the pins, then the groups, then the projects with no group', async () => {
    localStorage.setItem(PROJECT_PINS_KEY, JSON.stringify({ 'org-1': ['id-cli'] }));
    render(ProjectList, { workspaceId: 'org-1' });

    await screen.findByRole('region', { name: 'Deploys' });
    await waitFor(() => expect(cardsOf('Pinned')).toEqual(['id-cli']));

    const names = screen.getAllByRole('region').map(region => region.getAttribute('aria-label'));
    expect(names).toEqual(['Pinned', 'Deploys', 'No group']);
    expect(cardsOf('Deploys')).toEqual(['id-web', 'id-api']);
    expect(cardsOf('No group')).toEqual(['id-docs', 'id-cli', 'id-status']);
    expect(headerOf('Deploys')).toHaveTextContent('Deploys 2 1 failing');
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ order: 'position', section: { kind: 'group', groupId: 'g-1' } }),
    );
  });

  it('closes a section, and keeps it closed on the next visit', async () => {
    const page = render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    await userEvent.click(headerOf('Deploys'));

    expect(cardsOf('Deploys')).toEqual([]);
    expect(JSON.parse(localStorage.getItem(PROJECT_SECTIONS_KEY)!)).toEqual({ 'org-1': ['g-1'] });

    page.unmount();
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });
    expect(headerOf('Deploys', false)).toBeInTheDocument();
  });

  it('pins a project from its menu, and unpins it', async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });
    expect(screen.queryByRole('region', { name: 'Pinned' })).not.toBeInTheDocument();

    await openMenuOf('docs', 'No group');
    await userEvent.click(await findFloating('menuitem', 'Pin'));

    await waitFor(() => expect(cardsOf('Pinned')).toEqual(['id-docs']));
    expect(JSON.parse(localStorage.getItem(PROJECT_PINS_KEY)!)).toEqual({ 'org-1': ['id-docs'] });

    await openMenuOf('docs', 'Pinned');
    await userEvent.click(await findFloating('menuitem', 'Unpin'));

    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Pinned' })).not.toBeInTheDocument(),
    );
  });

  it('shows a new pin at once, while the pins load', async () => {
    const read = search.getMockImplementation()!;
    search.mockImplementation(async input => {
      if (input.projectIds) await new Promise(() => {});
      return read(input);
    });
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    await openMenuOf('docs', 'No group');
    await userEvent.click(await findFloating('menuitem', 'Pin'));

    await waitFor(() => expect(cardsOf('Pinned')).toEqual(['id-docs']));
  });

  it('moves a project to a group from its menu, last in the group', async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    await openMenuOf('docs', 'No group');
    await userEvent.click(await findFloating('menuitem', 'Move to group'));
    await userEvent.click(await findFloating('menuitem', 'Deploys'));

    await waitFor(() =>
      expect(groups.move).toHaveBeenCalledWith({ id: 'id-docs', groupId: 'g-1' }),
    );
  });

  it('moves a card up in its group, and not the first card', async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    await openMenuOf('api', 'Deploys');
    await userEvent.click(await findFloating('menuitem', 'Move up'));

    await waitFor(() =>
      expect(groups.move).toHaveBeenCalledWith({
        id: 'id-api',
        groupId: 'g-1',
        beforeId: 'id-web',
      }),
    );
    // The closed menu gives the pointer back to the page.
    await waitFor(() => expect(document.body.style.pointerEvents).not.toBe('none'));
    await openMenuOf('web', 'Deploys');
    expect(await findFloating('menuitem', 'Move up')).toHaveAttribute('data-disabled');
  });

  it('enters the reorder mode, and Escape leaves it with no save', async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    await userEvent.click(screen.getByRole('button', { name: 'Reorder' }));

    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Project menu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New project' })).not.toBeInTheDocument();
    // The pins take a drop in the mode, also with no pin.
    expect(screen.getByRole('region', { name: 'Pinned' })).toHaveTextContent(
      'Drop a card here to pin it.',
    );

    await userEvent.keyboard('{Escape}');

    expect(screen.getByRole('searchbox', { name: 'Search the projects' })).toBeInTheDocument();
    expect(groups.move).not.toHaveBeenCalled();
  });

  it('keeps the cards while the reorder mode reads all of them', async () => {
    let readAll = () => {};
    const all = new Promise<void>(resolve => (readAll = resolve));
    const read = search.getMockImplementation()!;
    search.mockImplementation(async input => {
      if (input.limit === REORDER_LIMIT) await all;
      return read(input);
    });
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    await userEvent.click(screen.getByRole('button', { name: 'Reorder' }));

    // No skeleton: the sections stay, and the pins come over them.
    expect(cardsOf('No group')).toEqual(['id-docs', 'id-cli', 'id-status']);
    expect(screen.getByRole('region', { name: 'Pinned' })).toBeInTheDocument();
    readAll();
    await waitFor(() =>
      expect(search).toHaveBeenCalledWith(expect.objectContaining({ limit: REORDER_LIMIT })),
    );
  });

  it('gives no reorder mode out of the custom order', async () => {
    teardown.push(
      installTestNavigator({ pathname: '/acme/projects', search: '?sort=name' }).restore,
    );
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    const reorder = screen.getByRole('button', { name: 'Reorder' });
    expect(reorder).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(reorder);
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
  });

  it('creates a group from the header, after the other groups', async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    await userEvent.click(newGroupOfHeader());
    await userEvent.type(screen.getByRole('textbox', { name: 'Group name' }), 'Releases{Enter}');

    await waitFor(() => expect(groups.create).toHaveBeenCalledWith('org-1', 'Releases', undefined));
    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'Group name' })).not.toBeInTheDocument(),
    );
  });

  it('creates a group with the folder color chosen in its row', async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    await userEvent.click(newGroupOfHeader());
    await userEvent.click(screen.getByRole('button', { name: 'Folder color of the new group' }));
    await userEvent.click(await floatingButton('Color 2'));
    await userEvent.keyboard('{Escape}');
    await userEvent.type(screen.getByRole('textbox', { name: 'Group name' }), 'Releases{Enter}');

    await waitFor(() => expect(groups.create).toHaveBeenCalledWith('org-1', 'Releases', 'chart-2'));
  });

  it('changes the folder color from the header, and saves it when the colors close', async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    const folder = within(section('Deploys')).getByRole('button', {
      name: 'Change the folder color of Deploys',
    });
    await userEvent.click(folder);
    expect(await floatingButton('Color 3')).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(await floatingButton('Color 4'));
    expect(groups.update).not.toHaveBeenCalled();

    await userEvent.keyboard('{Escape}');

    await waitFor(() =>
      expect(groups.update).toHaveBeenCalledWith('g-1', { name: undefined, color: 'chart-4' }),
    );
  });

  it('offers the free color of the icons for a folder, with its hex field', async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    await userEvent.click(
      within(section('Deploys')).getByRole('button', {
        name: 'Change the folder color of Deploys',
      }),
    );
    await userEvent.click(await floatingButton('Free color'));

    expect(await screen.findByLabelText('Hex color')).toBeInTheDocument();
  });

  it('resets the folder color of a group to the default folder', async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    await userEvent.click(
      within(section('Deploys')).getByRole('button', {
        name: 'Change the folder color of Deploys',
      }),
    );
    await userEvent.click(await floatingButton('Reset'));
    await userEvent.keyboard('{Escape}');

    await waitFor(() =>
      expect(groups.update).toHaveBeenCalledWith('g-1', { name: undefined, color: '' }),
    );
  });

  it('opens the folder colors from « Folder color… » in the group menu', async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    await userEvent.click(within(section('Deploys')).getByRole('button', { name: 'Group menu' }));
    await userEvent.click(await findFloating('menuitem', 'Folder color…'));

    expect(await floatingButton('Reset')).toBeInTheDocument();
  });

  it('changes the folder color in the rename row, with no new name', async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    await userEvent.click(within(section('Deploys')).getByRole('button', { name: 'Group menu' }));
    await userEvent.click(await findFloating('menuitem', 'Rename'));
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();

    await userEvent.click(
      screen.getByRole('button', { name: 'Change the folder color of Deploys' }),
    );
    await userEvent.click(await floatingButton('Main color'));
    await userEvent.keyboard('{Escape}');
    await userEvent.click(save);

    await waitFor(() =>
      expect(groups.update).toHaveBeenCalledWith('g-1', { name: undefined, color: 'primary' }),
    );
  });

  it('shows the folder colors in « Move to group », and creates a colored group from there', async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    await openMenuOf('docs', 'No group');
    await userEvent.click(await findFloating('menuitem', 'Move to group'));
    const deploys = await findFloating('menuitem', 'Deploys');
    expect(deploys.querySelector('[data-slot="color-glyph"] svg')).toHaveAttribute(
      'stroke',
      'var(--chart-3)',
    );
    await userEvent.click(await findFloating('menuitem', 'New group…'));

    const dialog = await screen.findByRole('dialog', { name: 'New group' });
    const field = within(dialog).getByRole('group', { name: 'Folder color' });
    await userEvent.click(within(field).getByRole('button', { name: 'Color 5' }));
    await userEvent.type(within(dialog).getByLabelText('Group name'), 'Releases');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(groups.create).toHaveBeenCalledWith('org-1', 'Releases', 'chart-5'));
    await waitFor(() =>
      expect(groups.move).toHaveBeenCalledWith({ id: 'id-docs', groupId: 'g-2' }),
    );
  });
});

/**
 * The layout of a browser, which jsdom does not compute: the sections are 1000 px apart, each
 * header is 32 px high, and each grid has 3 columns of cards of 400 × 300 px, 16 px apart. The
 * lifted card (`position: fixed`) is out of the grid.
 */
const W = 400;
const H = 300;
const STEP = 416;
const CELL = '[data-card], [data-part="project-drop-slot"]';
const box = (left: number, top: number, width: number, height: number) =>
  ({ left, top, width, height, right: left + width, bottom: top + height }) as DOMRect;
const topOf = (node: Element) =>
  [...document.querySelectorAll('[data-section]')].indexOf(node.closest('[data-section]')!) * 1000;
const placeOf = (node: Element) =>
  [...node.parentElement!.children]
    .filter(child => child.matches(CELL) && (child as HTMLElement).style.position !== 'fixed')
    .indexOf(node);

const stubLayout = () => {
  const rect = Element.prototype.getBoundingClientRect;
  const offsets = ['offsetLeft', 'offsetTop', 'offsetWidth', 'offsetHeight'] as const;
  const saved = offsets.map(name => Object.getOwnPropertyDescriptor(HTMLElement.prototype, name));
  Element.prototype.getBoundingClientRect = function (this: Element) {
    if (!this.closest('[data-section]')) return rect.call(this);
    const top = topOf(this);
    if (this.matches('[data-section]')) return box(0, top, 1232, 900);
    if (this.matches('[data-part="project-section-header"]')) return box(0, top, 1232, 32);
    if (this.matches('[data-part="project-grid"]')) return box(0, top + 44, 1232, 632);
    const place = placeOf(this);
    if (this.matches(CELL) && place >= 0) {
      return box((place % 3) * STEP, top + 44 + Math.floor(place / 3) * (H + 16), W, H);
    }
    return rect.call(this);
  };
  const offset = (name: (typeof offsets)[number]) =>
    function (this: HTMLElement) {
      const place = this.matches(CELL) ? placeOf(this) : -1;
      if (place < 0) return 0;
      return {
        offsetLeft: (place % 3) * STEP,
        offsetTop: Math.floor(place / 3) * (H + 16),
        offsetWidth: W,
        offsetHeight: H,
      }[name];
    };
  for (const name of offsets) {
    Object.defineProperty(HTMLElement.prototype, name, { configurable: true, get: offset(name) });
  }
  return () => {
    Element.prototype.getBoundingClientRect = rect;
    offsets.forEach((name, index) => {
      Object.defineProperty(HTMLElement.prototype, name, saved[index]!);
    });
  };
};

const pointer = (target: EventTarget, type: string, x: number, y: number) =>
  target.dispatchEvent(
    Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
      button: 0,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'mouse',
      clientX: x,
      clientY: y,
    }),
  );

/** Takes a card at `grab` (from its top left corner) and moves the pointer by `dx`, `dy`. */
const dragCard = async (id: string, grab: { x: number; y: number }, dx: number, dy: number) => {
  const card = await waitFor(() => {
    const found = document.querySelector<HTMLElement>(`[data-card="${id}"]`);
    expect(found).not.toBeNull();
    return found!;
  });
  const { left, top } = card.getBoundingClientRect();
  const start = { x: left + grab.x, y: top + grab.y };
  pointer(card, 'pointerdown', start.x, start.y);
  pointer(window, 'pointermove', start.x + dx / 2, start.y + dy / 2);
  pointer(window, 'pointermove', start.x + dx, start.y + dy);
  return () => pointer(window, 'pointerup', start.x + dx, start.y + dy);
};

const gridOf = (name: string) =>
  [...section(name).querySelectorAll('[data-part="project-grid"] > *')].map(
    cell => cell.getAttribute('data-card') ?? cell.getAttribute('data-part'),
  );

describe('the drag of the reorder mode', () => {
  beforeEach(() => {
    teardown.push(stubLayout());
  });

  const reorderMode = async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });
    await userEvent.click(screen.getByRole('button', { name: 'Reorder' }));
    await waitFor(() => expect(cardsOf('No group')).toEqual(['id-docs', 'id-cli', 'id-status']));
  };

  it('moves the other card aside when the dragged card covers it, held at its right edge', async () => {
    await reorderMode();

    // « status » is held at its move icon, and moves left by one card width.
    const release = await dragCard('id-status', { x: W - 10, y: 40 }, -W, 0);

    await waitFor(() =>
      expect(gridOf('No group')).toEqual(['id-docs', 'project-drop-slot', 'id-cli', 'id-status']),
    );
    expect(screen.getByText('“status”: place 2 of 3 in No group')).toBeInTheDocument();

    release();

    await waitFor(() => expect(cardsOf('No group')).toEqual(['id-docs', 'id-status', 'id-cli']));
    expect(screen.getByText('“status” is now at place 2 of 3 in No group')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Done' }));

    await waitFor(() =>
      expect(groups.move).toHaveBeenCalledWith({ id: 'id-status', beforeId: 'id-cli' }),
    );
  });

  it('puts a card last in a group when its center is on the header of the group', async () => {
    await reorderMode();

    // « docs » (No group, at 2044 px) goes up until its center is on the header of « Deploys ».
    const release = await dragCard('id-docs', { x: 200, y: 20 }, 0, 1016 - (2044 + H / 2));

    expect(
      await within(section('Deploys')).findByText('Release to move “docs” into Deploys'),
    ).toBeInTheDocument();
    release();

    await waitFor(() => expect(cardsOf('Deploys')).toEqual(['id-web', 'id-api', 'id-docs']));
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));

    await waitFor(() =>
      expect(groups.move).toHaveBeenCalledWith({ id: 'id-docs', groupId: 'g-1' }),
    );
  });

  it('shows the saved order when it leaves the mode, while the page reads its cards again', async () => {
    await reorderMode();
    const release = await dragCard('id-status', { x: W - 10, y: 40 }, -W, 0);
    await waitFor(() => expect(gridOf('No group')).toContain('project-drop-slot'));
    release();
    await waitFor(() => expect(cardsOf('No group')).toEqual(['id-docs', 'id-status', 'id-cli']));

    // The server keeps the new order. After the save, the first cards of the page load slowly.
    const SAVED = ['id-docs', 'id-status', 'id-cli'];
    const read = search.getMockImplementation()!;
    search.mockImplementation(async input => {
      const saved = groups.move.mock.calls.length > 0;
      if (!saved || input.section?.kind !== 'ungrouped') return read(input);
      if (input.limit !== REORDER_LIMIT) await new Promise(() => {});
      const result = await read(input);
      const items = [...result.items].sort((a, b) => SAVED.indexOf(a.id) - SAVED.indexOf(b.id));
      return { ...result, items };
    });
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));

    await screen.findByRole('searchbox', { name: 'Search the projects' });
    expect(cardsOf('No group')).toEqual(SAVED);
  });

  it('sends the card back with Escape and stays in the reorder mode', async () => {
    await reorderMode();

    await dragCard('id-status', { x: W - 10, y: 40 }, -W, 0);
    await waitFor(() => expect(gridOf('No group')).toContain('project-drop-slot'));
    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(gridOf('No group')).toEqual(['id-docs', 'id-cli', 'id-status']));
    expect(screen.getByText('“status” is back at its place')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });
});

describe('the calls to action of the sections', () => {
  const grant = (permissions: Permission[]) =>
    permissionsStore.setState({
      permissions: {
        scopes: [
          {
            scope: PermissionScope.WORKSPACE,
            scopeId: 'org-1',
            access: { kind: 'restricted', permissions },
          },
        ],
      },
    });
  const link = (sectionName: string, name: string) =>
    within(section(sectionName)).getByRole('link', { name });

  it('offers a new project in each group, with the group: its "+", its menu and a ghost card', async () => {
    const { navigate } = installTestNavigator({ pathname: '/acme/projects' });
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    expect(link('Deploys', 'New project in Deploys')).toHaveAttribute(
      'href',
      '/acme/projects/new?group=g-1',
    );
    expect(link('Deploys', 'New project')).toHaveAttribute('href', '/acme/projects/new?group=g-1');
    expect(link('No group', 'New project with no group')).toHaveAttribute(
      'href',
      '/acme/projects/new',
    );
    expect(link('No group', 'New project')).toHaveAttribute('href', '/acme/projects/new');
    // The ghost card is not a card: no drag, no project id.
    expect(cardsOf('Deploys')).toEqual(['id-web', 'id-api']);

    await userEvent.click(within(section('Deploys')).getByRole('button', { name: 'Group menu' }));
    await userEvent.click(await findFloating('menuitem', 'New project here'));

    expect(navigate).toHaveBeenCalledWith('/acme/projects/new?group=g-1', undefined);
  });

  it('hides the "+" and the ghost card in the reorder mode', async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    await userEvent.click(screen.getByRole('button', { name: 'Reorder' }));

    expect(within(section('Deploys')).queryAllByRole('link')).toEqual([]);
    expect(within(section('No group')).queryAllByRole('link')).toEqual([]);
  });

  it('offers no new project to a person who cannot create one', async () => {
    grant([Permission.READ_WORKSPACE, Permission.UPDATE_PROJECT]);
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    expect(within(section('Deploys')).queryAllByRole('link')).toEqual([]);
    expect(within(section('No group')).queryAllByRole('link')).toEqual([]);
    await userEvent.click(within(section('Deploys')).getByRole('button', { name: 'Group menu' }));
    await findFloating('menuitem', 'Rename');
    expect(screen.queryByRole('menuitem', { name: 'New project here', hidden: true })).toBeNull();
  });

  it('gives an empty group one line of text and its « New project »', async () => {
    groups.list.mockResolvedValue([DEPLOYS, { id: 'g-2', workspaceId: 'org-1', name: 'Releases' }]);
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Releases' });

    await waitFor(() =>
      expect(section('Releases')).toHaveTextContent(
        'No project in this group yet. Create one here, or move a card into it.',
      ),
    );
    expect(link('Releases', 'New project')).toHaveAttribute('href', '/acme/projects/new?group=g-2');
  });

  it('opens the « New group » row from the end of the page and from « No group »', async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    const ofUngrouped = within(section('No group')).getByRole('button', { name: 'New group' });
    const end = document.querySelector<HTMLElement>('[data-part="project-new-group-end"]')!;
    expect(end).toHaveAccessibleName('New group');
    await userEvent.click(end);

    expect(screen.getByRole('textbox', { name: 'Group name' })).toHaveFocus();
    expect(document.querySelector('[data-part="project-new-group-end"]')).toBeNull();
    expect(ofUngrouped).not.toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    await userEvent.click(within(section('No group')).getByRole('button', { name: 'New group' }));
    expect(screen.getByRole('textbox', { name: 'Group name' })).toBeInTheDocument();
  });
});

describe('a folded section', () => {
  const fold = (keys: string[]) =>
    localStorage.setItem(PROJECT_SECTIONS_KEY, JSON.stringify({ 'org-1': keys }));
  const lineOf = (sectionName: string) =>
    within(section(sectionName)).getByRole('group', { name: /folded$/ });
  const chipsOf = (line: HTMLElement) =>
    within(line)
      .getAllByRole('button')
      .map(chip => chip.textContent?.trim());

  it('shows one line with a chip for each project, in the order of the group', async () => {
    fold(['g-1']);
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    const line = await waitFor(() => lineOf('Deploys'));
    expect(line).toHaveAccessibleName('2 projects in Deploys, folded');
    expect(chipsOf(line)).toEqual(['web', 'api']);
    expect(cardsOf('Deploys')).toEqual([]);
  });

  it('ends the line with "+N" for the projects with no chip', async () => {
    const read = search.getMockImplementation()!;
    search.mockImplementation(async input => {
      const result = await read(input);
      return input.section?.kind === 'ungrouped'
        ? { ...result, counts: { ...result.counts, total: result.counts.total + 4 } }
        : result;
    });
    fold(['ungrouped']);
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    const line = await waitFor(() => lineOf('No group'));
    expect(line).toHaveAccessibleName('7 projects in No group, folded');
    expect(within(line).getByRole('button', { name: '4 more projects' })).toHaveTextContent('+4');
  });

  it('opens the group at the card of a chip, and scrolls to it', async () => {
    const scroll = vi.mocked(Element.prototype.scrollIntoView);
    scroll.mockClear();
    fold(['g-1']);
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    const line = await waitFor(() => lineOf('Deploys'));
    await userEvent.click(within(line).getByRole('button', { name: 'api' }));

    expect(headerOf('Deploys')).toHaveAttribute('aria-expanded', 'true');
    expect(cardsOf('Deploys')).toEqual(['id-web', 'id-api']);
    expect(JSON.parse(localStorage.getItem(PROJECT_SECTIONS_KEY)!)).toEqual({});
    await waitFor(() => expect(scroll).toHaveBeenCalled());
    expect(scroll.mock.contexts[0]).toBe(section('Deploys').querySelector('[data-card="id-api"]'));
  });

  it('opens the group with "+N" and with the free part of the line', async () => {
    fold(['g-1']);
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    await userEvent.click(await waitFor(() => lineOf('Deploys')));

    expect(headerOf('Deploys')).toHaveAttribute('aria-expanded', 'true');
    expect(within(section('Deploys')).queryByRole('group', { name: /folded$/ })).toBeNull();
  });

  it('folds the pins to a line of chips too', async () => {
    localStorage.setItem(PROJECT_PINS_KEY, JSON.stringify({ 'org-1': ['id-cli', 'id-web'] }));
    fold(['pins']);
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Pinned' });

    const line = await waitFor(() => lineOf('Pinned'));
    expect(line).toHaveAccessibleName('2 projects in Pinned, folded');
    expect(chipsOf(line)).toEqual(['cli', 'web']);
  });

  it('folds an open group to its line, and the header opens it again', async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    await userEvent.click(headerOf('Deploys'));
    expect(chipsOf(lineOf('Deploys'))).toEqual(['web', 'api']);

    await userEvent.click(headerOf('Deploys', false));
    expect(cardsOf('Deploys')).toEqual(['id-web', 'id-api']);
    expect(within(section('Deploys')).queryByRole('group', { name: /folded$/ })).toBeNull();
  });

  it('puts the line in the place of the cards, in one box: the cards fade out over it', async () => {
    const reduced = window.matchMedia;
    window.matchMedia = vi.fn((query: string) => ({ ...reduced(query), matches: false }));
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });
    const body = section('Deploys').querySelector<HTMLElement>(
      '[data-part="project-section-body"]',
    )!;
    const cards = body.firstElementChild as HTMLElement;

    await userEvent.click(headerOf('Deploys'));

    const line = lineOf('Deploys');
    expect(line.parentElement?.parentElement).toBe(body);
    expect(cards.parentElement).toBe(body);
    expect(cards.inert).toBe(true);
    expect(body.children).toHaveLength(2);
  });
});

const OPS: ProjectGroupEntity = { id: 'g-2', workspaceId: 'org-1', name: 'Ops' };
/** The keys of the sections, in the order of the page. */
const sectionOrder = () =>
  [...document.querySelectorAll('[data-section]')].map(node => node.getAttribute('data-section'));
const densityOfCards = (name: string) =>
  [...section(name).querySelectorAll('[data-tour="project-card"]')].map(card =>
    card.getAttribute('data-density'),
  );

describe('the display of the sections', () => {
  it('changes the display of the page from « Display », and of one section from its menu', async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });

    await userEvent.click(screen.getByRole('button', { name: 'Display: Comfortable' }));
    await userEvent.click(await findFloating('menuitemradio', 'Compact'));

    await waitFor(() => expect(section('Deploys')).toHaveAttribute('data-density', 'compact'));
    expect(section('No group')).toHaveAttribute('data-density', 'compact');
    expect(densityOfCards('Deploys')).toEqual(['compact', 'compact']);

    await userEvent.click(
      within(section('No group')).getByRole('button', { name: 'Section menu' }),
    );
    await userEvent.click(await findFloating('menuitem', 'Display'));
    await userEvent.click(await findFloating('menuitemradio', 'List'));

    await waitFor(() => expect(section('No group')).toHaveAttribute('data-density', 'list'));
    expect(densityOfCards('No group')).toEqual(['list', 'list', 'list']);
    expect(section('Deploys')).toHaveAttribute('data-density', 'compact');
    expect(JSON.parse(localStorage.getItem(PROJECT_DENSITY_KEY)!)).toEqual({
      'org-1': { default: 'compact', sections: { ungrouped: 'list' } },
    });
  });

  it('gives each section the display of the page with « Apply to all sections »', async () => {
    localStorage.setItem(
      PROJECT_DENSITY_KEY,
      JSON.stringify({ 'org-1': { default: 'tiles', sections: { 'g-1': 'list' } } }),
    );
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Deploys' });
    expect(section('Deploys')).toHaveAttribute('data-density', 'list');
    expect(section('No group')).toHaveAttribute('data-density', 'tiles');

    await userEvent.click(screen.getByRole('button', { name: 'Display: Tiles' }));
    await userEvent.click(await findFloating('menuitem', 'Apply to all sections'));

    await waitFor(() => expect(section('Deploys')).toHaveAttribute('data-density', 'tiles'));
    expect(densityOfCards('Deploys')).toEqual(['tiles', 'tiles']);
  });

  it('shows the display menu on the pins and on « No group » too, with no group items', async () => {
    localStorage.setItem(PROJECT_PINS_KEY, JSON.stringify({ 'org-1': ['id-docs'] }));
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Pinned' });

    await userEvent.click(within(section('Pinned')).getByRole('button', { name: 'Section menu' }));

    expect(await findFloating('menuitem', 'Display')).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Delete the group', hidden: true })).toBeNull();
  });
});

describe('the order of the groups in the reorder mode', () => {
  beforeEach(() => {
    groups.list.mockResolvedValue([DEPLOYS, OPS]);
    groups.reorder.mockResolvedValue(OPS);
  });

  const reorderMode = async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Ops' });
    await userEvent.click(screen.getByRole('button', { name: 'Reorder' }));
    return within(section('Ops')).getByRole('button', { name: 'Move the group Ops' });
  };

  it('shows the handle of a group in the reorder mode only, and not on the pins or « No group »', async () => {
    render(ProjectList, { workspaceId: 'org-1' });
    await screen.findByRole('region', { name: 'Ops' });
    expect(screen.queryByRole('button', { name: /^Move the group/ })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Reorder' }));

    expect(
      within(section('Deploys')).getByRole('button', { name: 'Move the group Deploys' }),
    ).toBeInTheDocument();
    expect(within(section('Pinned')).queryByRole('button', { name: /^Move the group/ })).toBeNull();
    expect(
      within(section('No group')).queryByRole('button', { name: /^Move the group/ }),
    ).toBeNull();
  });

  it('moves a group with the keyboard, and « Done » saves the order of the groups', async () => {
    const grip = await reorderMode();
    grip.focus();

    await userEvent.keyboard(' ');

    expect(grip).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByText(
        '“Ops” is lifted, at place 2 of 2 in the groups. The arrow keys move it, Space drops it, and Escape cancels.',
      ),
    ).toBeInTheDocument();

    await userEvent.keyboard('{ArrowUp}');

    await waitFor(() => expect(sectionOrder()).toEqual(['pins', 'g-2', 'g-1', 'ungrouped']));
    await waitFor(() => expect(grip).toHaveFocus());

    await userEvent.keyboard(' ');

    expect(screen.getByText('“Ops” is now at place 1 of 2 in the groups')).toBeInTheDocument();
    expect(groups.reorder).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Done' }));

    await waitFor(() => expect(groups.reorder).toHaveBeenCalledWith('g-2', 0));
    expect(groups.reorder).toHaveBeenCalledTimes(1);
  });

  it('gives the group its place back with Escape, and stays in the reorder mode', async () => {
    const grip = await reorderMode();
    grip.focus();
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{ArrowUp}');
    await waitFor(() => expect(sectionOrder()).toEqual(['pins', 'g-2', 'g-1', 'ungrouped']));

    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(sectionOrder()).toEqual(['pins', 'g-1', 'g-2', 'ungrouped']));
    expect(screen.getByText('“Ops” is back at its place')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('moves a group from its menu in the mode, and « Cancel » forgets the new order', async () => {
    await reorderMode();

    await userEvent.click(within(section('Ops')).getByRole('button', { name: 'Group menu' }));
    await userEvent.click(await findFloating('menuitem', 'Move up'));

    await waitFor(() => expect(sectionOrder()).toEqual(['pins', 'g-2', 'g-1', 'ungrouped']));
    expect(groups.reorder).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(sectionOrder()).toEqual(['g-1', 'g-2', 'ungrouped']));
    expect(groups.reorder).not.toHaveBeenCalled();
  });

  it('drags a group by its handle: the sections fold, and the slot follows the header', async () => {
    teardown.push(stubGroupLayout());
    const grip = await reorderMode();
    expect(cardsOf('Deploys')).toEqual(['id-web', 'id-api']);

    // « Ops » (the second group, at 100 px) is taken at its handle and goes up by 100 px.
    pointer(grip, 'pointerdown', 10, 110);
    pointer(window, 'pointermove', 10, 60);
    await waitFor(() =>
      expect(document.querySelector('[data-part="group-drop-slot"]')).not.toBeNull(),
    );
    expect(cardsOf('Deploys')).toEqual([]);
    pointer(window, 'pointermove', 10, 10);

    await waitFor(() =>
      expect(screen.getByText('“Ops”: place 1 of 2 in the groups')).toBeInTheDocument(),
    );
    pointer(window, 'pointerup', 10, 10);

    await waitFor(() => expect(sectionOrder()).toEqual(['pins', 'g-2', 'g-1', 'ungrouped']));
    expect(screen.getByText('“Ops” is now at place 1 of 2 in the groups')).toBeInTheDocument();
    await waitFor(() => expect(cardsOf('Deploys')).toEqual(['id-web', 'id-api']));

    await userEvent.click(screen.getByRole('button', { name: 'Done' }));

    await waitFor(() => expect(groups.reorder).toHaveBeenCalledWith('g-2', 0));
  });
});

/**
 * The layout of the groups, which jsdom does not compute: each group is 100 px under the one
 * before it, with a header 40 px high. The lifted group (`position: fixed`) is out of the column.
 */
const stubGroupLayout = () => {
  const GROUP_CELL = '[data-group-cell], [data-part="group-drop-slot"]';
  const rect = Element.prototype.getBoundingClientRect;
  const offsets = ['offsetLeft', 'offsetTop', 'offsetWidth', 'offsetHeight'] as const;
  const saved = offsets.map(name => Object.getOwnPropertyDescriptor(HTMLElement.prototype, name));
  const placeOfGroup = (cell: Element) =>
    [...cell.parentElement!.children]
      .filter(
        child => child.matches(GROUP_CELL) && (child as HTMLElement).style.position !== 'fixed',
      )
      .indexOf(cell);
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const cell = this.closest('[data-group-cell]');
    if (cell && this.matches('[data-part="project-section-header"]')) {
      return box(0, placeOfGroup(cell) * 100, 1232, 40);
    }
    return rect.call(this);
  };
  const offset = (name: (typeof offsets)[number]) =>
    function (this: HTMLElement) {
      const place = this.matches(GROUP_CELL) ? placeOfGroup(this) : -1;
      if (place < 0) return 0;
      return { offsetLeft: 0, offsetTop: place * 100, offsetWidth: 1232, offsetHeight: 40 }[name];
    };
  for (const name of offsets) {
    Object.defineProperty(HTMLElement.prototype, name, { configurable: true, get: offset(name) });
  }
  return () => {
    Element.prototype.getBoundingClientRect = rect;
    offsets.forEach((name, index) => {
      Object.defineProperty(HTMLElement.prototype, name, saved[index]!);
    });
  };
};
