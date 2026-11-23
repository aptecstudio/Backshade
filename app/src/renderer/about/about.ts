/**
 * Punto di ingresso della finestra Informazioni: prepara la localizzazione,
 * chiede al motore le informazioni sull'applicazione e monta la pagina.
 */

import { initI18n, t } from '../i18n/i18n.js';
import { engine } from '../transport/engine.js';
import { AboutPage } from './about-page.js';

await initI18n();
document.title = t('about.title');

const info = await engine().request('app.getInfo');
new AboutPage(info).mount(document.body);

document.documentElement.dataset.ready = 'true';
