/**
 * Entry of the 3D stage window.
 */

import { Label } from '../../framework/ts/index.js';
import { initI18n, t } from '../i18n/i18n.js';
import { initTouchMode } from '../preferences/touch-mode.js';
import { followOperators } from '../show/operator-store.js';
import { initShowStore } from '../show/show-store.js';
import { isRemote } from '../transport/engine.js';
import { listModels } from './model-library.js';
import { StagePage } from './stage-page.js';

initTouchMode();
await initI18n();
document.title = `${t('stage.title')} - ${t('app.name')}`;
await initShowStore();
followOperators();
// The 3D stage is only for the computer of the application, never for devices connected to it
if (isRemote()) {
    new Label({ text: t('stage.notRemote'), tone: 'secondary' }).mount(document.body);
} else {
    new StagePage(await listModels()).mount(document.body);
}

document.documentElement.dataset.ready = 'true';
