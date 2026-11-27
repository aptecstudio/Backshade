/**
 * Entry point of the interface (ES module): prepares the localization,
 * reads the open show from the engine, mounts the application structure and
 * follows MIDI learn. A remote client first enters with the PIN and connects.
 */

import { initI18n, t } from './i18n/i18n.js';
import { followMidiLearn } from './midi/midi-learn.js';
import { initTouchMode } from './preferences/touch-mode.js';
import { AppShell } from './shell/app-shell.js';
import { initShowStore } from './show/show-store.js';
import { installBrowserCompat } from './remote/browser-compat.js';
import { connectRemote } from './remote/connection.js';
import { isRemote } from './transport/engine.js';

initTouchMode();
await initI18n();
if (isRemote()) {
    installBrowserCompat();
    await connectRemote();
}
await initShowStore();
document.title = t('app.name');
new AppShell().mount(document.body);
followMidiLearn();

document.documentElement.dataset.ready = 'true';
