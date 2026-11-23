/**
 * Choice of the interface language, saved on this device.
 * It shows all the available languages, including those installed by the user,
 * and updates when the engine reports a pack added or removed.
 */

import { Key, Label, Panel, Stack, type LanguageInfo } from '../../../framework/ts/index.js';
import { availableLocales, changeLocale, currentLocale, refreshLocales, t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';

export class LanguageSettings extends Panel {
    private keys: Stack;

    constructor() {
        super({ title: t('settings.language') });

        this.keys = this.createKeys(availableLocales());
        this.append(this.keys, new Label({ text: t('settings.languageHint'), tone: 'secondary', size: 'small' }));

        this.track(engine().on('locales.changed', () => {
            void refreshLocales().then((locales) => this.replaceKeys(locales));
        }));
    }

    /**
     * Creates one key per language; the key of the active language is lit.
     */
    private createKeys(locales: readonly LanguageInfo[]): Stack {
        const keys = locales.map((locale) => {
            const active = locale.code === currentLocale();
            const key = new Key({ label: locale.name, state: active ? 'active' : 'normal' });
            if (!active) {
                key.onPress(() => changeLocale(locale.code));
            }
            return key;
        });
        return new Stack({ direction: 'row', gap: 1, wrap: true, classes: ['language-keys'], children: keys });
    }

    /**
     * Replaces the keys with those of the new list.
     */
    private replaceKeys(locales: readonly LanguageInfo[]): void {
        const next = this.createKeys(locales);
        this.keys.element.replaceWith(next.element);
        this.keys.destroy();
        this.adopt(next);
        this.keys = next;
    }
}
