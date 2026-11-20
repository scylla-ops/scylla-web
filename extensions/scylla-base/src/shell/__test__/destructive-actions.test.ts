// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse, type AST } from 'svelte/compiler';

/**
 * Reads the markup of each component: what an action does is in its label, and no type sees
 * it. An action that deletes, removes, revokes, disables or deactivates has the destructive
 * variant of `@scylla/ui`, so that it looks the same in a menu, a row, a header and a dialog.
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const ACTIONS = new Set(['Button', 'IconButton', 'GatedButton', 'DropdownMenuItem', 'button']);
/** The message key of a label that takes something away starts with one of these words. */
const DESTRUCTIVE_KEY = /^(?:delete|remove|revoke|disable|deactivate)/;
const LABEL_KEY = /\bt\(\s*\w+\.(\w+)/g;
const HAND_MADE = /(?:^|[\s'"`:])!?(?:text|bg)-destructive\b/;

/** A ratchet, as `UNGATED_FEATURES`: an entry leaves when its control changes. */
const NOT_DESTRUCTIVE: Readonly<Record<string, string>> = {
  removeArgument: 'Removes a row of a form that is not saved yet.',
  removeVariable: 'Removes a row of a form that is not saved yet.',
  removeInput: 'Removes a row of a form that is not saved yet.',
  removeRow: 'Removes a row of a form that is not sent yet.',
  removeChip: 'Removes a person from a list that is not sent yet.',
  removeDependency: 'Removes a value from a field of the pipeline draft.',
  removeRole: 'The cross of a chip of a role picker: the same card adds the role back.',
  removeInstanceAdmin: 'A change of role: the same button gives the role back.',
};

const walkDir = (dir: string): string[] =>
  readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .map(path => join(dir, path))
    .filter(path => path.endsWith('.svelte') && !path.endsWith('.fixture.svelte'));

type Element = AST.Component | AST.RegularElement;

const elementsOf = (root: AST.Fragment): Element[] => {
  const found: Element[] = [];
  const seen = new WeakSet<object>();
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) return value.forEach(visit);
    const node = value as { type?: unknown };
    if (node.type === 'Component' || node.type === 'RegularElement') found.push(node as Element);
    Object.values(value).forEach(visit);
  };
  visit(root);
  return found.sort((a, b) => a.start - b.start);
};

interface Action {
  at: string;
  name: string;
  keys: string[];
  destructive: boolean;
  handMade: boolean;
}

const files = walkDir(SRC).map(path => {
  const source = readFileSync(path, 'utf8');
  const elements = elementsOf(parse(source, { modern: true, filename: path }).fragment);
  const at = path.slice(SRC.length + 1).replaceAll('\\', '/');
  const attribute = (element: Element, name: string): string => {
    const found = element.attributes.find(attr => attr.type === 'Attribute' && attr.name === name);
    return found ? source.slice(found.start, found.end) : '';
  };
  /** Its own classes and those of its direct children, as its icon: not a status deeper in it. */
  const classes = (element: Element): string =>
    [
      attribute(element, 'class'),
      attribute(element, 'iconClass'),
      ...element.fragment.nodes
        .filter(
          (child): child is Element =>
            child.type === 'Component' || child.type === 'RegularElement',
        )
        .map(child => attribute(child, 'class')),
    ].join(' ');
  const isDestructive = (element: Element): boolean =>
    attribute(element, 'variant').includes('destructive');
  return { at, source, elements, classes, isDestructive };
});

const actions: Action[] = files.flatMap(({ at, source, elements, classes, isDestructive }) =>
  elements
    .filter(element => ACTIONS.has(element.name))
    .map(element => {
      const markup = source.slice(element.start, element.end);
      return {
        at,
        name: element.name,
        keys: [...markup.matchAll(LABEL_KEY)].map(([, key]) => key),
        destructive: isDestructive(element),
        handMade: HAND_MADE.test(classes(element)),
      };
    }),
);

const describeAction = (action: Action) =>
  `${action.at}: <${action.name}> ${action.keys.join(', ')}`;

describe('a destructive action', () => {
  it('is searched in every component, the menu of the members table included', () => {
    expect(
      actions.some(
        action =>
          action.at.endsWith('MembersTable/MembersTable.svelte') &&
          action.keys.includes('removeFromWorkspace'),
      ),
    ).toBe(true);
  });

  it('uses a destructive variant when its label deletes, removes, revokes or disables', () => {
    const plain = actions
      .filter(
        action =>
          !action.destructive &&
          action.keys.some(key => DESTRUCTIVE_KEY.test(key) && !(key in NOT_DESTRUCTIVE)),
      )
      .map(describeAction);

    expect(plain, 'add `variant="destructive"` (or `ghost-destructive` on a Button)').toEqual([]);
  });

  it('gets its red from the variant, never from a class', () => {
    const handMade = actions.filter(action => action.handMade).map(describeAction);

    expect(handMade, 'remove the class and use the destructive variant').toEqual([]);
  });

  it('comes last in a menu, after a separator', () => {
    const misplaced = files.flatMap(({ at, elements, isDestructive }) =>
      elements
        .filter(element => element.name === 'DropdownMenuContent')
        .flatMap(menu => {
          const parts = elements
            .filter(
              element =>
                element.start > menu.start &&
                element.end < menu.end &&
                (element.name === 'DropdownMenuItem' || element.name === 'DropdownMenuSeparator'),
            )
            .map(element => ({
              separator: element.name === 'DropdownMenuSeparator',
              destructive: isDestructive(element),
            }));
          const first = parts.findIndex(part => !part.separator && part.destructive);
          if (first === -1) return [];
          const after = parts.slice(first);
          const before = parts.slice(0, first);
          const lastPlain = before.map(part => part.separator).lastIndexOf(false);
          const separated =
            lastPlain === -1 || before.slice(lastPlain).some(part => part.separator);
          const last = after.every(part => part.separator || part.destructive);
          return separated && last ? [] : [`${at}: menu at ${menu.start}`];
        }),
    );

    expect(
      misplaced,
      'put the destructive items at the end, after a DropdownMenuSeparator',
    ).toEqual([]);
  });

  it('keeps no stale exception', () => {
    const labels = new Set(actions.flatMap(action => action.keys));
    const stale = Object.keys(NOT_DESTRUCTIVE).filter(key => !labels.has(key));

    expect(stale).toEqual([]);
  });
});
