// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const WORKSPACE = join(dirname(fileURLToPath(import.meta.url)), '../../../../..');
const CLASS_STRING = /(?<=["'`}])[^"'`{}\n]*(?=["'`{])/g;
const SCROLLS = /(?:^|\s)(?:\S*:)?!?overflow-(?:[xy]-)?(?:auto|scroll)!?(?=\s|$)/;
const POSITIONED = /(?:^|\s)!?(?:relative|absolute|fixed|sticky)!?(?=\s|$)/;

const POSITIONED_ELSEWHERE: Record<string, string> = {
  'packages/ui/src/primitives/dialog/dialog-content.svelte':
    '`CENTERED_DIALOG_CLASS` makes it `fixed`; a `relative` in the same `cn()` would replace it',
};

const sources = ['apps', 'packages', 'sdks', 'extensions'].flatMap(dir =>
  readdirSync(join(WORKSPACE, dir), { recursive: true, encoding: 'utf8' })
    .filter(
      path =>
        /\.(svelte|ts)$/.test(path) && !/node_modules|dist\/|generated\/|\.test\.ts$/.test(path),
    )
    .map(path => join(dir, path)),
);

const scrollers = sources.flatMap(path =>
  (readFileSync(join(WORKSPACE, path), 'utf8').match(CLASS_STRING) ?? [])
    .filter(classes => SCROLLS.test(classes))
    .map(classes => ({ path, classes: classes.trim(), positioned: POSITIONED.test(classes) })),
);

describe('an element that scrolls', () => {
  it('is searched in every class string, the roles list included', () => {
    expect(scrollers.map(scroller => scroller.path)).toContain(
      'extensions/scylla-base/src/features/roles/presentation/ui/components/RolesView.svelte',
    );
  });

  it('is `relative`: else an `sr-only` or other absolute descendant escapes it and stretches the page', () => {
    const unpositioned = scrollers
      .filter(scroller => !scroller.positioned && !(scroller.path in POSITIONED_ELSEWHERE))
      .map(scroller => `${scroller.path}: ${scroller.classes}`);

    expect(unpositioned, 'add `relative` to the same class string').toEqual([]);
  });

  it('keeps no stale exception', () => {
    const stale = Object.keys(POSITIONED_ELSEWHERE).filter(
      path => !scrollers.some(scroller => scroller.path === path && !scroller.positioned),
    );

    expect(stale).toEqual([]);
  });
});
