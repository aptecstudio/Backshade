/**
 * Settings section, split into two tabs: application settings
 * (saved on the workstation) and show settings
 * (saved with the show, available only with an open show, to its
 * administrators when the show has operators).
 */

import { Key, Stack, type Component } from '../../../framework/ts/index.js';
import { t } from '../../i18n/i18n.js';
import { canManageShow, onOperatorChange } from '../../show/operator-store.js';
import { currentShow, onShowChange } from '../../show/show-store.js';
import { engine } from '../../transport/engine.js';
import { AboutSettings } from './about-settings.js';
import { ControlValuesSettings } from './control-values-settings.js';
import { LanguageSettings } from './language-settings.js';
import { RemoteSettings } from './remote-settings.js';
import { ShowSettingsPanels } from './show-settings-panels.js';
import { ShowsFolderSettings } from './shows-folder-settings.js';
import { TouchSettings } from './touch-settings.js';

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

        this.open(this.showAvailable() ? 'show' : 'application');
        const follow = (): void => {
            this.showKey.setDisabled(!this.showAvailable());
            if (!this.showAvailable() && this.tab === 'show') {
                this.open('application');
            }
        };
        this.track(onShowChange(follow));
        this.track(onOperatorChange(follow));
        this.track(() => this.content?.destroy());
    }

    private open(tab: SettingsTab): void {
        this.tab = tab;
        this.applicationKey.setState(tab === 'application' ? 'active' : 'normal');
        this.showKey.setState(tab === 'show' ? 'active' : 'normal');
        this.showKey.setDisabled(!this.showAvailable());

        this.content?.destroy();
        this.content = null;
        if (tab === 'application') {
            this.mountContent(new Stack({ gap: 3, children: [new LanguageSettings(), new ControlValuesSettings(), new TouchSettings(), new ShowsFolderSettings(), new RemoteSettings(), new AboutSettings()] }));
            return;
        }
        void engine().request('show.getSettings').then((settings) => {
            if (this.tab === 'show') {
                this.mountContent(new ShowSettingsPanels(settings));
            }
        });
    }

    /** The show tab can be opened: a show is open and the operator manages it */
    private showAvailable(): boolean {
        return currentShow() !== null && canManageShow();
    }

    private mountContent(content: Component): void {
        this.content?.destroy();
        this.content = content;
        content.mount(this.element);
    }
}
