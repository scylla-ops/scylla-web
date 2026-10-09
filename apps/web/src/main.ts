import '@scylla/ui/styles.css';
import { startCore } from '@scylla/core';
import { extensions } from './extensions.ts';

const target = document.getElementById('root');

if (!target) {
  throw new Error('Root element not found');
}

void startCore({ extensions, target });
