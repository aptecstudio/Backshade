/**
 * Entry point of the component catalog (development only):
 * prepares the localization and mounts the page.
 */

import { t, initI18n } from '../i18n/i18n.js';
import { CatalogPage } from './catalog-page.js';

await initI18n();
document.title = `${t('app.name')} - ${t('catalog.title')}`;
new CatalogPage().mount(document.body);

document.documentElement.dataset.ready = 'true';
