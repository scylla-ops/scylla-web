import { describe, expect, it } from 'vitest';
import { expectNoLayoutShift } from '../layout.ts';

const row = (html: string): HTMLElement => {
  document.body.innerHTML = `<div id="row" class="flex gap-2">${html}</div>`;
  return document.getElementById('row') as HTMLElement;
};

const byId = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

describe('expectNoLayoutShift', () => {
  it('fails when a part comes before the element in the flow', async () => {
    const within = row('<button id="save">Save</button>');

    await expect(
      expectNoLayoutShift(() => byId('save').insertAdjacentHTML('beforebegin', '<span>Saved</span>'), byId('save'), { within }),
    ).rejects.toThrow(/before/);
  });

  it('fails when a part after the element changes its text, in a row aligned to the right', async () => {
    const within = row('<button id="cancel">Cancel</button><button id="submit">Save</button>');

    await expect(
      expectNoLayoutShift(() => (byId('submit').textContent = 'Saving...'), byId('cancel'), {
        within,
        align: 'end',
      }),
    ).rejects.toThrow(/after/);
  });

  it('fails when a parent gets a spacing class', async () => {
    const within = row('<button id="edit">Edit</button>');

    await expect(
      expectNoLayoutShift(() => within.classList.add('pt-3'), byId('edit'), { within }),
    ).rejects.toThrow(/parent/);
  });

  it('fails when the element is replaced', async () => {
    const within = row('<button id="pin">Pin</button>');

    await expect(
      expectNoLayoutShift(() => (within.innerHTML = '<button id="pin">Pin</button>'), byId('pin'), { within }),
    ).rejects.toThrow(/replaced/);
  });

  it('passes when the change is out of the flow, invisible or a paint', async () => {
    const within = row(
      '<span id="hint" class="invisible">Saved</span><button id="save" class="bg-primary">Save</button>',
    );

    await expectNoLayoutShift(
      () => {
        within.insertAdjacentHTML('afterbegin', '<div class="absolute inset-0">Drop here</div>');
        byId('hint').classList.replace('invisible', 'visible');
        byId('save').classList.replace('bg-primary', 'bg-muted');
        byId('save').setAttribute('disabled', '');
      },
      byId('save'),
      { within },
    );
  });

  it('passes when an icon takes the place of another of the same size', async () => {
    const within = row('<button id="copy"><svg class="size-4"><path d="M1"/></svg></button>');

    await expectNoLayoutShift(
      () => {
        byId('copy').innerHTML = '<svg class="size-4"><path d="M2"/><path d="M3"/></svg>';
      },
      byId('copy'),
      { within },
    );
  });
});
