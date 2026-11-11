// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse, type AST } from 'svelte/compiler';

/**
 * Reads the markup of each component: a layout has no type. A radio, a checkbox or a switch in
 * a label is a choice. In a card with a title and a description, it is centered vertically on
 * the whole card, not on the line of the title.
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const CONTROLS = new Set(['RadioGroupItem', 'Checkbox', 'Switch']);
const HAS_CONTROL = /<(?:RadioGroupItem|Checkbox|Switch)\b/;
const CENTERED = /(?:^|[\s'"`])items-center(?=[\s'"`]|$)/;
const ON_FIRST_LINE =
  /(?:^|[\s'"`])(?:[\w-]+:)*(?:items-start|items-baseline|self-start|-?mt-[\w.[\]-]+)(?=[\s'"`]|$)/;

type Element = AST.Component | AST.RegularElement;

const isLabel = (node: Element) =>
  (node.type === 'Component' && node.name === 'Label') ||
  (node.type === 'RegularElement' && node.name === 'label');

const childrenOf = (node: object): Element[] =>
  Object.values(node).flatMap(value => {
    const fragment = value as AST.Fragment | null;
    if (fragment?.type !== 'Fragment') return [];
    return fragment.nodes.flatMap(child =>
      child.type === 'Component' || child.type === 'RegularElement' ? [child] : childrenOf(child),
    );
  });

interface Choice {
  at: string;
  /** The class of the label, of each element between them, and of the control. */
  classes: string[];
}

const choices: Choice[] = readdirSync(SRC, { recursive: true, encoding: 'utf8' })
  .filter(path => path.endsWith('.svelte'))
  .flatMap(path => {
    const source = readFileSync(join(SRC, path), 'utf8');
    if (!HAS_CONTROL.test(source)) return [];
    const at = path.replaceAll('\\', '/');
    const classOf = (element: Element) => {
      const found = element.attributes.find(
        attr => attr.type === 'Attribute' && attr.name === 'class',
      );
      return found ? source.slice(found.start, found.end) : '';
    };
    const found: Choice[] = [];
    const visit = (elements: Element[], chain: Element[] | null) =>
      elements.forEach(element => {
        const next = isLabel(element) ? [element] : chain && [...chain, element];
        if (next && element.type === 'Component' && CONTROLS.has(element.name)) {
          found.push({
            at: `${at}: <${element.name}> at ${element.start}`,
            classes: next.map(classOf),
          });
        }
        visit(childrenOf(element), next);
      });
    visit(childrenOf(parse(source, { modern: true, filename: path })), null);
    return found;
  });

describe('a choice in a label', () => {
  it('is searched in every component, the cards of the projects of a new agent included', () => {
    expect(choices.map(choice => choice.at).join('\n')).toContain('ProjectChooser.svelte');
  });

  it('is centered on the whole label: the label has `items-center`', () => {
    const offCenter = choices
      .filter(choice => !CENTERED.test(choice.classes[0] ?? ''))
      .map(choice => choice.at);

    expect(offCenter, 'add `items-center` to the label').toEqual([]);
  });

  it('is not put on the first line of the text by an element between them or by itself', () => {
    const onFirstLine = choices
      .filter(choice => choice.classes.some(classes => ON_FIRST_LINE.test(classes)))
      .map(choice => choice.at);

    expect(
      onFirstLine,
      'remove `items-start`, `items-baseline`, `self-start` or the top margin',
    ).toEqual([]);
  });
});
