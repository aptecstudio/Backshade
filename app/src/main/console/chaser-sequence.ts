/**
 * Order of the steps of a chaser: loop, back and forth, random or once.
 */

import type { ChaserDirection } from '../../shared/console/memories';

/** Position in the steps, with the travel direction for back and forth */
export interface SequencePosition {
    step: number;
    /** 1 forward, -1 backward */
    heading: 1 | -1;
}

/**
 * Next step of a chaser, or null when a one shot chaser has played its last step.
 * @param count - Number of steps, at least 1
 * @param random - Random source, 0 (included) to 1 (excluded)
 */
export function nextStep(direction: ChaserDirection, position: SequencePosition, count: number, random: () => number = Math.random): SequencePosition | null {
    const step = Math.min(position.step, count - 1);
    switch (direction) {
        case 'loop':
            return { step: (step + 1) % count, heading: 1 };
        case 'oneShot':
            return step + 1 < count ? { step: step + 1, heading: 1 } : null;
        case 'random': {
            if (count < 2) {
                return { step: 0, heading: 1 };
            }
            // Never the same step twice in a row
            const next = Math.floor(random() * (count - 1));
            return { step: next >= step ? next + 1 : next, heading: 1 };
        }
        case 'bounce': {
            if (count < 2) {
                return { step: 0, heading: 1 };
            }
            let heading = position.heading;
            if (step + heading < 0 || step + heading >= count) {
                heading = heading === 1 ? -1 : 1;
            }
            return { step: step + heading, heading };
        }
    }
}
