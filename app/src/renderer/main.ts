/**
 * Punto di ingresso dell'interfaccia (ES module): prepara la localizzazione
 * e monta la struttura dell'applicazione.
 */

import { initI18n, t } from './i18n/i18n.js';
import { AppShell } from './shell/app-shell.js';

await initI18n();
document.title = t('app.name');
new AppShell().mount(document.body);

document.documentElement.dataset.ready = 'true';
