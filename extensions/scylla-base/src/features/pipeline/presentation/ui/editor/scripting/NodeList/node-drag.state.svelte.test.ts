import { describe, it, expect, vi } from 'vitest';
import { createNodeDrag } from './node-drag.state.svelte.ts';

describe('createNodeDrag', () => {
  it('drops the dragged node on its target, then forgets the drag', () => {
    const onDrop = vi.fn();
    const drag = createNodeDrag({ onDrop });

    drag.start('build');
    drag.drop('lint', true);

    expect(onDrop).toHaveBeenCalledWith('build', 'lint', true);
    expect(drag.dragged).toBeNull();
  });

  it('accepts any target but the dragged node, and the "runs first" zone', () => {
    const drag = createNodeDrag({ onDrop: vi.fn() });
    expect(drag.canDrop('lint')).toBe(false);

    drag.start('build');
    expect(drag.canDrop('lint')).toBe(true);
    expect(drag.canDrop(null)).toBe(true);
    expect(drag.canDrop('build')).toBe(false);
  });

  it('tells the target under the pointer, and the "runs first" zone apart from no target', () => {
    const drag = createNodeDrag({ onDrop: vi.fn() });
    drag.start('build');

    drag.hover(null);
    expect(drag.isOver(null)).toBe(true);
    expect(drag.isOver('lint')).toBe(false);

    drag.leave(null);
    expect(drag.isOver(null)).toBe(false);
  });

  it('ignores a leave from a target the pointer is no longer over', () => {
    const drag = createNodeDrag({ onDrop: vi.fn() });
    drag.start('build');
    drag.hover('lint');

    drag.leave('test');
    expect(drag.isOver('lint')).toBe(true);
  });

  it('calls nothing when a drag ends without a drop', () => {
    const onDrop = vi.fn();
    const drag = createNodeDrag({ onDrop });

    drag.start('build');
    drag.end();
    drag.drop('lint', false);

    expect(onDrop).not.toHaveBeenCalled();
  });
});
