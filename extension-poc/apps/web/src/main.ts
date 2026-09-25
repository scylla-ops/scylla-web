import { Core } from '@scylla/core';


// 1. Le Core s'initialise et branche ses écouteurs
const core = new Core();

// 2. IMPORTANT : On importe l'extension APRES l'initialisation du Core
// pour que le décorateur trouve le handler déjà en place.
import.meta.glob('./extensions/**/*.extension.ts', { eager: true });

core.init();