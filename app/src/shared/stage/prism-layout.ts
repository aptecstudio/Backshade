/**
 * Where a prism repeats the light, as seen on a surface facing the fixture:
 * few facets on one ring, many on two rings (18 facets: 12 outside and 6
 * inside, the middle left empty). Positions and size are parts of the radius
 * of the whole pattern.
 */

export interface PrismLayout {
    /** Centre of every copy, X right and Y up */
    copies: Array<[number, number]>;
    /** Radius of a copy */
    size: number;
}

/** Facets from which the copies go on two rings */
const TWO_RINGS = 12;

function ring(count: number, radius: number, turn = 0): Array<[number, number]> {
    return Array.from({ length: count }, (_, index) => {
        const angle = ((index + turn) / count) * Math.PI * 2;
        return [Math.sin(angle) * radius, Math.cos(angle) * radius];
    });
}

export function prismLayout(facets: number): PrismLayout {
    if (facets <= 1) {
        return { copies: [[0, 0]], size: 1 };
    }
    if (facets < TWO_RINGS) {
        // Copies as large as they can be without covering each other
        const size = Math.min(0.42, Math.sin(Math.PI / facets) / (1 + Math.sin(Math.PI / facets)));
        return { copies: ring(facets, 1 - size), size };
    }
    const inner = Math.round(facets / 3);
    const size = Math.min(0.19, (0.81 * Math.sin(Math.PI / (facets - inner))));
    return { copies: [...ring(facets - inner, 1 - size), ...ring(inner, (1 - size) / 2, 0.5)], size };
}
