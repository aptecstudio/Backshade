/**
 * Punto di ingresso dell'interfaccia (ES module): prepara la localizzazione,
 * legge lo show aperto dal motore e monta la struttura dell'applicazione.
 */

import { initI18n, t } from './i18n/i18n.js';
import { AppShell } from './shell/app-shell.js';
import { initShowStore } from './show/show-store.js';

await initI18n();
await initShowStore();
document.title = t('app.name');
new AppShell().mount(document.body);

document.documentElement.dataset.ready = 'true';
