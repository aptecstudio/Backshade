/**
 * Sezione delle impostazioni, divisa in due schede: impostazioni
 * dell'applicazione (salvate sulla postazione) e impostazioni dello show
 * (salvate con lo show, disponibili solo con uno show aperto).
 */

import { Key, Stack, type Component } from '../../../framework/ts/index.js';
import { t } from '../../i18n/i18n.js';
import { currentShow, onShowChange } from '../../show/show-store.js';
import { engine } from '../../transport/engine.js';
import { AboutSettings } from './about-settings.js';
import { LanguageSettings } from './language-settings.js';
import { ShowSettingsPanels } from './show-settings-panels.js';
import { ShowsFolderSettings } from './shows-folder-settings.js';

type SettingsTab = 'application' | 'show';

export class SettingsSection extends Stack {
    private readonly applicationKey: Key;
    private readonly showKey: Key;
    private content: Component | null = null;
    private tab: SettingsTab = 'application';

    constructor() {
        super({ gap: 3, classes: ['settings-section'] });

        this.applicationKey = new Key({ label: t('settings.application') });
        this.showKey = new Key({ label: t('settings.show') });
        this.applicationKey.onPress(() => this.open('application'));
        this.showKey.onPress(() => this.open('show'));
        this.append(new Stack({ direction: 'row', gap: 1, children: [this.applicationKey, this.showKey] }));

        this.open(currentShow() === null ? 'application' : 'show');
        this.track(onShowChange((show) => {
            this.showKey.setDisabled(show === null);
            if (show === null && this.tab === 'show') {
                this.open('application');
            }
        }));
        this.track(() => this.content?.destroy());
    }

    private open(tab: SettingsTab): void {
        this.tab = tab;
        this.applicationKey.setState(tab === 'application' ? 'active' : 'normal');
        this.showKey.setState(tab === 'show' ? 'active' : 'normal');
        this.showKey.setDisabled(currentShow() === null);

        this.content?.destroy();
        this.content = null;
        if (tab === 'application') {
            this.mountContent(new Stack({ gap: 3, children: [new LanguageSettings(), new ShowsFolderSettings(), new AboutSettings()] }));
            return;
        }
        void engine().request('show.getSettings').then((settings) => {
            if (this.tab === 'show') {
                this.mountContent(new ShowSettingsPanels(settings));
            }
        });
    }

    private mountContent(content: Component): void {
        this.content?.destroy();
        this.content = content;
        content.mount(this.element);
    }
}
