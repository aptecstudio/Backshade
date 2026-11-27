/**
 * Entry point of the interface (ES module): prepares the localization,
 * reads the open show from the engine, mounts the application structure and
 * follows MIDI learn.
 */

import { initI18n, t } from './i18n/i18n.js';
import { followMidiLearn } from './midi/midi-learn.js';
import { AppShell } from './shell/app-shell.js';
import { initShowStore } from './show/show-store.js';

await initI18n();
await initShowStore();
document.title = t('app.name');
new AppShell().mount(document.body);
followMidiLearn();

document.documentElement.dataset.ready = 'true';
