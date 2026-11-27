/**
 * Truss models of the stage.
 */

import { Obj } from './obj.mts';

/** Square truss of 29 cm along X, with chords, uprights and diagonals */
export function truss(length: number): Obj {
    const obj = new Obj();
    obj.object('truss');
    obj.material('aluminium');
    const half = 0.12;
    const chords: Array<[number, number]> = [[-half, 0], [half, 0], [half, 2 * half], [-half, 2 * half]];
    for (const [z, y] of chords) {
        obj.tube([-length / 2, y + 0.025, z], [length / 2, y + 0.025, z], 0.025, 8);
    }
    const bays = Math.round(length / 0.25);
    chords.forEach(([z, y], side) => {
        const [nextZ, nextY] = chords[(side + 1) % 4];
        for (let bay = 0; bay <= bays; bay++) {
            const x = -length / 2 + (bay * length) / bays;
            if (bay === 0 || bay === bays) {
                obj.tube([x, y + 0.025, z], [x, nextY + 0.025, nextZ], 0.008, 6);
            }
            if (bay < bays) {
                const end = x + length / bays;
                obj.tube([bay % 2 === 0 ? x : end, y + 0.025, z], [bay % 2 === 0 ? end : x, nextY + 0.025, nextZ], 0.008, 6);
            }
        }
    });
    return obj;
}
