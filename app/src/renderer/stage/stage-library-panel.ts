/**
 * Panel of what can be added to the stage: the fixtures of the patch not yet
 * placed, and the models of the library by category.
 */

import { Emitter, Label, ListItem, Panel, Stack, type Unsubscribe } from '../../framework/ts/index.js';
import type { PatchEntry } from '../../shared/transport/engine-api.js';
import { t } from '../i18n/i18n.js';
import type { ModelCategory, ModelInfo } from './model-library.js';

/** Categories added from the library; fixtures come from the patch */
const CATEGORIES: readonly ModelCategory[] = ['truss', 'stage', 'musicians', 'elements'];

export function modelName(id: string): string {
    return t(`stage.models.${id}` as 'stage.models.par');
}

export class StageLibraryPanel extends Panel {
    private readonly additions = new Emitter<string>();
    private readonly placements = new Emitter<PatchEntry>();
    private fixtureList = new Stack();
    private readonly fixtureArea = new Stack({ gap: 1 });

    constructor(models: readonly ModelInfo[]) {
        super({ title: t('stage.library'), classes: ['stage-panel'] });
        this.append(new Label({ text: t('stage.fixtures'), tone: 'secondary', size: 'small' }), this.fixtureArea);
        for (const category of CATEGORIES) {
            const rows = models.filter((model) => model.category === category).map((model) => {
                const item = new ListItem({ children: [new Label({ text: modelName(model.id), size: 'small' })] });
                item.onPress(() => this.additions.emit(model.id));
                return item;
            });
            if (rows.length > 0) {
                this.append(new Label({ text: t(`stage.categories.${category}`), tone: 'secondary', size: 'small' }), new Stack({ children: rows }));
            }
        }
    }

    /** A model of the library was chosen */
    onAdd(listener: (model: string) => void): Unsubscribe {
        return this.additions.subscribe(listener);
    }

    /** A fixture of the patch was chosen */
    onPlace(listener: (fixture: PatchEntry) => void): Unsubscribe {
        return this.placements.subscribe(listener);
    }

    /** Shows the fixtures still to place */
    setFixtures(fixtures: readonly PatchEntry[]): void {
        this.fixtureList.destroy();
        this.fixtureList = new Stack({
            children: fixtures.length === 0
                ? [new Label({ text: t('stage.noFixtures'), size: 'small' })]
                : fixtures.map((fixture) => {
                    const item = new ListItem({ children: [new Label({ text: `${fixture.number}  ${fixture.name}`, size: 'small' })] });
                    item.onPress(() => this.placements.emit(fixture));
                    return item;
                })
        });
        this.fixtureArea.append(this.fixtureList);
    }
}
