/**
 * Scelta della lingua dell'interfaccia, salvata su questo dispositivo.
 * Mostra tutte le lingue disponibili, incluse quelle installate dall'utente,
 * e si aggiorna quando il motore segnala un pacchetto aggiunto o rimosso.
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
     * Crea un tasto per ogni lingua; quello della lingua attiva è acceso.
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
     * Sostituisce i tasti con quelli del nuovo elenco.
     */
    private replaceKeys(locales: readonly LanguageInfo[]): void {
        const next = this.createKeys(locales);
        this.keys.element.replaceWith(next.element);
        this.keys.destroy();
        this.adopt(next);
        this.keys = next;
    }
}
