/**
 * Entry point of the interface (ES module): prepares the localization,
 * reads the open show from the engine and mounts the application structure.
 */

import { initI18n, t } from './i18n/i18n.js';
import { AppShell } from './shell/app-shell.js';
import { initShowStore } from './show/show-store.js';

await initI18n();
await initShowStore();
document.title = t('app.name');
new AppShell().mount(document.body);

document.documentElement.dataset.ready = 'true';
