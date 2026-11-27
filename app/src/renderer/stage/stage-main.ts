/**
 * Entry of the 3D stage window.
 */

import { initI18n, t } from '../i18n/i18n.js';
import { initTouchMode } from '../preferences/touch-mode.js';
import { StagePage } from './stage-page.js';

initTouchMode();
await initI18n();
document.title = `${t('stage.title')} - ${t('app.name')}`;
new StagePage().mount(document.body);

document.documentElement.dataset.ready = 'true';
