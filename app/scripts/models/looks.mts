/**
 * Hair cut and colors of every figure, so singers and musicians are told
 * apart on the stage. The colors are material names (see stage-materials).
 */

export type HairStyle = 'bald' | 'buzz' | 'short' | 'quiff' | 'curly' | 'bob' | 'long' | 'ponytail' | 'bun';

export interface Look {
    hair: HairStyle;
    hairColor: 'hair' | 'hair-black' | 'hair-blond' | 'hair-red' | 'hair-grey';
    /** Shirt, or the whole dress */
    top: string;
    /** Trousers */
    bottom: string;
    /** A woman wears a dress instead of trousers */
    dress?: boolean;
}

const look = (hair: HairStyle, hairColor: Look['hairColor'], top: string, bottom = 'trousers', dress = false): Look =>
    ({ hair, hairColor, top: `wear-${top}`, bottom: bottom === 'trousers' ? bottom : `wear-${bottom}`, dress });

/** Looks by role: of the man, then of the woman */
export const LOOKS = {
    singer: [look('short', 'hair', 'slate'), look('long', 'hair-blond', 'red', 'trousers', true)],
    guitarist: [look('long', 'hair-black', 'black', 'denim'), look('ponytail', 'hair-red', 'ochre', 'black')],
    acoustic: [look('curly', 'hair', 'ochre', 'khaki'), look('bob', 'hair', 'green', 'denim')],
    bassist: [look('bald', 'hair', 'red', 'black'), look('bob', 'hair-black', 'purple', 'black')],
    drummer: [look('buzz', 'hair-black', 'white', 'denim'), look('bun', 'hair', 'teal', 'black')],
    keyboardist: [look('quiff', 'hair-blond', 'blue', 'khaki'), look('curly', 'hair-black', 'white', 'denim')],
    pianist: [look('short', 'hair-grey', 'black', 'black'), look('bun', 'hair-blond', 'black', 'black')],
    harpist: [look('long', 'hair', 'white', 'black'), look('long', 'hair-red', 'teal', 'black')],
    violinist: [look('quiff', 'hair', 'black', 'black'), look('ponytail', 'hair-black', 'red', 'trousers', true)],
    trumpeter: [look('curly', 'hair-black', 'purple', 'black'), look('bob', 'hair-blond', 'blue', 'black')],
    trombonist: [look('short', 'hair-red', 'green', 'khaki'), look('curly', 'hair', 'ochre', 'denim')],
    saxophonist: [look('buzz', 'hair-grey', 'blue', 'black'), look('long', 'hair-black', 'white', 'black')],
    flutist: [look('bald', 'hair', 'teal', 'denim'), look('bun', 'hair-red', 'green', 'trousers', true)],
    trioViolin: [look('short', 'hair-black', 'white', 'black'), look('bun', 'hair', 'black', 'black')],
    trioViola: [look('curly', 'hair-grey', 'slate', 'black'), look('bob', 'hair-red', 'purple', 'black')],
    trioCello: [look('bald', 'hair', 'black', 'black'), look('ponytail', 'hair-blond', 'blue', 'black')]
} as const satisfies Record<string, readonly [Look, Look]>;

export type Role = keyof typeof LOOKS;
