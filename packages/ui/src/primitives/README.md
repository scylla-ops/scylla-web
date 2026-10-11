# `@scylla/ui/primitives`

> [`@scylla/ui`](../../README.md) › `primitives` · [agent guide](../../AGENTS.md)

The lowest layer of the design system: buttons, cards, dialogs, menus, selects, tables, tooltips.
The composites of `@scylla/ui` (`DataTable`, `ScyllaDialog`, `ScyllaForm`, …) are built on them.

Each primitive has its own folder (`card/`, `dialog/`, …), with its variants, its messages and its
tests. Import them from `@scylla/ui/primitives`, never from a file in this folder.

## Origin

These components are adapted from [shadcn/ui](https://github.com/shadcn-ui/ui), a React library.
We ported them to Svelte 5 on [bits-ui](https://github.com/huntabyte/bits-ui). The Tailwind class
strings were copied from shadcn/ui, then changed where the Scylla design needed it.

This is not [shadcn-svelte](https://github.com/huntabyte/shadcn-svelte), and no CLI manages these
files. We keep the shadcn/ui API (part names, `data-slot`, variants), so that a reader who knows
shadcn/ui can use them at once.

## shadcn/ui license

The parts copied from shadcn/ui are under this license:

```
MIT License

Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
