/**
 * Sezione del catalogo con i tasti: morbidi, quadrati e funzione.
 * Un clic cambia lo stato, per provare le varianti.
 */

import { FunctionKey, Key, Label, Panel, SquareKey, Stack, type KeyState } from '../../framework/ts/index.js';
import { t } from '../i18n/i18n.js';

export class KeysSection extends Panel {
    constructor() {
        super({ title: t('catalog.keys') });

        this.append(
            this.softKeys(),
            new Label({ text: t('catalog.squareKeys'), tone: 'secondary', size: 'small' }),
            this.squareKeys(),
            new Label({ text: t('catalog.functionKeys'), tone: 'secondary', size: 'small' }),
            this.functionKeys()
        );
    }

    private softKeys(): Stack {
        const consoleKey = new Key({ label: t('sections.console'), state: 'active' });
        const grid = new Key({ label: t('console.grid') });
        const patch = new Key({ label: t('sections.patch'), state: 'inactive' });
        const blackout = new Key({ label: t('console.blackout'), armed: true });
        const play = new Key({ label: t('playback.go'), icon: 'play', size: 'large', state: 'active' });

        // Rotazione degli stati per provare le varianti
        const states: KeyState[] = ['normal', 'active', 'inactive'];
        for (const key of [consoleKey, grid, patch]) {
            let index = 0;
            key.onPress(() => {
                index = (index + 1) % states.length;
                key.setState(states[index]);
            });
        }
        let armed = true;
        blackout.onPress(() => {
            armed = !armed;
            blackout.setArmed(armed);
        });

        return new Stack({ direction: 'row', gap: 1, align: 'center', wrap: true, children: [consoleKey, grid, patch, blackout, play] });
    }

    private squareKeys(): Stack {
        const keys = [
            new SquareKey({ variant: 'flash', icon: 'zap', label: t('console.flash'), on: true }),
            new SquareKey({ variant: 'flash', icon: 'zap', label: t('console.flash') }),
            new SquareKey({ variant: 'solo', icon: 'headphones', label: t('console.solo'), on: true }),
            new SquareKey({ variant: 'solo', icon: 'headphones', label: t('console.solo') }),
            new SquareKey({ variant: 'select', text: t('console.selectShort'), label: t('console.select'), on: true }),
            new SquareKey({ variant: 'select', text: t('console.selectShort'), label: t('console.select') })
        ];
        keys.forEach((key, index) => {
            let on = index % 2 === 0;
            key.onPress(() => {
                on = !on;
                key.setOn(on);
            });
        });

        return new Stack({ direction: 'row', gap: 2, align: 'center', children: keys });
    }

    private functionKeys(): Stack {
        const labels = [
            t('attributes.dimmer'),
            t('attributes.color'),
            t('attributes.position'),
            t('attributes.beam'),
            t('attributes.effects')
        ];
        const keys = labels.map((label, index) => {
            const key = new FunctionKey({ caption: `F${index + 1}`, label, active: index === 0 });
            let active = index === 0;
            key.onPress(() => {
                active = !active;
                key.setActive(active);
            });
            return key;
        });

        return new Stack({ direction: 'row', gap: 2, children: keys });
    }
}
