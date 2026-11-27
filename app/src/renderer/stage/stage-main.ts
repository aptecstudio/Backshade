/**
 * Entry of the 3D stage window.
 */

import { initI18n, t } from '../i18n/i18n.js';
import { initTouchMode } from '../preferences/touch-mode.js';
import { followOperators } from '../show/operator-store.js';
import { initShowStore } from '../show/show-store.js';
import { listModels } from './model-library.js';
import { StagePage } from './stage-page.js';

initTouchMode();
await initI18n();
document.title = `${t('stage.title')} - ${t('app.name')}`;
await initShowStore();
followOperators();
new StagePage(await listModels()).mount(document.body);

document.documentElement.dataset.ready = 'true';
