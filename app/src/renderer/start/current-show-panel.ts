/**
 * Show aperto nella schermata iniziale: nome, stato del salvataggio e
 * operazioni sullo show. Visibile solo quando uno show è aperto.
 */

import { Key, Label, Panel, Stack } from '../../framework/ts/index.js';
import type { ShowSummary } from '../../shared/transport/engine-api.js';
import { t } from '../i18n/i18n.js';
import { closeShow, renameShow, saveAsTemplate, saveShow, saveShowAs } from '../show/show-commands.js';
import { currentShow, onShowChange } from '../show/show-store.js';

export class CurrentShowPanel extends Panel {
    private readonly name: Label;
    private readonly state: Label;
    private readonly folder: Label;

    constructor() {
        super({ title: t('start.currentShow'), classes: ['current-show'] });

        this.name = new Label({ text: '', size: 'large', weight: 'medium' });
        this.state = new Label({ text: '', size: 'small' });
        this.folder = new Label({ text: '', tone: 'secondary', size: 'small' });

        const commands: Array<[string, () => Promise<void>]> = [
            [t('start.save'), saveShow],
            [t('start.saveAs'), saveShowAs],
            [t('start.rename'), renameShow],
            [t('start.saveAsTemplate'), saveAsTemplate],
            [t('start.closeShow'), closeShow]
        ];
        const keys = commands.map(([label, command]) => {
            const key = new Key({ label });
            key.onPress(() => void command());
            return key;
        });

        this.append(
            new Stack({ gap: 1, children: [this.name, this.state, this.folder] }),
            new Stack({ direction: 'row', gap: 1, wrap: true, children: keys })
        );

        this.render(currentShow());
        this.track(onShowChange((show) => this.render(show)));
    }

    private render(show: ShowSummary | null): void {
        this.element.hidden = show === null;
        if (show === null) {
            return;
        }
        this.name.setText(show.name);
        this.state.setText(show.dirty ? t('start.unsaved') : t('start.saved'));
        this.state.element.classList.toggle('label--accent', show.dirty);
        this.state.element.classList.toggle('label--secondary', !show.dirty);
        this.folder.setText(show.folder);
    }
}
