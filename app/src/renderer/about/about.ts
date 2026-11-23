/**
 * Entry point of the About window: prepares the localization,
 * asks the engine for the application information and mounts the page.
 */

import { initI18n, t } from '../i18n/i18n.js';
import { engine } from '../transport/engine.js';
import { AboutPage } from './about-page.js';

await initI18n();
document.title = t('about.title');

const info = await engine().request('app.getInfo');
new AboutPage(info).mount(document.body);

document.documentElement.dataset.ready = 'true';
