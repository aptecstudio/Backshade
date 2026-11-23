/**
 * Punto di ingresso del catalogo dei componenti (solo sviluppo):
 * prepara la localizzazione e monta la pagina.
 */

import { t, initI18n } from '../i18n/i18n.js';
import { CatalogPage } from './catalog-page.js';

await initI18n();
document.title = `${t('app.name')} - ${t('catalog.title')}`;
new CatalogPage().mount(document.body);

document.documentElement.dataset.ready = 'true';
