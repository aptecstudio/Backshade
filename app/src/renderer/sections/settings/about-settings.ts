/**
 * About panel in the settings: version and access to the
 * About window.
 */

import { Key, Label, Panel, Stack } from '../../../framework/ts/index.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';

export class AboutSettings extends Panel {
    constructor() {
        super({ title: t('about.title') });

        const version = new Label({ text: t('app.name'), tone: 'secondary' });
        const open = new Key({ label: t('about.open') });
        open.onPress(() => {
            void engine().request('window.openAbout');
        });

        this.append(new Stack({ direction: 'row', gap: 2, align: 'center', children: [open, version] }));

        void engine().request('app.getInfo').then((info) => {
            version.setText(`${info.name} ${t('about.version', { version: info.version })}`);
        });
    }
}
