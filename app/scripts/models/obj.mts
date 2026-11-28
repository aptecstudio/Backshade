/**
 * Writer of the OBJ files of the stage models: boxes, cylinders, spheres and
 * smooth lofted surfaces. Faces are listed counterclockwise seen from outside.
 */

import { add, cross, scale, sub, unit, type Vector } from './vector.mts';

/** Cross section of a lofted surface: centre, half width and half depth */
export interface Section {
    at: Vector;
    width: number;
    depth: number;
}

/** Millimeters are enough for the stage */
const numbers = (values: Vector, decimals = 3): string => values.map((value) => Number(value.toFixed(decimals))).join(' ');

/** Catmull-Rom interpolation of the sections, for rounded profiles */
function smooth(sections: Section[], steps: number): Section[] {
    const values = sections.map((section) => [...section.at, section.width, section.depth]);
    const out: number[][] = [];
    for (let index = 0; index < values.length - 1; index++) {
        const [a, b, c, d] = [index - 1, index, index + 1, index + 2].map((i) => values[Math.max(0, Math.min(values.length - 1, i))]);
        for (let step = 0; step < steps; step++) {
            const t = step / steps;
            out.push(b.map((value, k) => 0.5 * (2 * value + (c[k] - a[k]) * t + (2 * a[k] - 5 * value + 4 * c[k] - d[k]) * t * t + (3 * value - a[k] - 3 * c[k] + d[k]) * t * t * t)));
        }
    }
    out.push(values[values.length - 1]);
    return out.map(([x, y, z, width, depth]) => ({ at: [x, y, z], width: Math.max(width, 0.001), depth: Math.max(depth, 0.001) }));
}

/** Writer of an OBJ file: faces are listed counterclockwise seen from outside */
export class Obj {
    private readonly lines: string[] = ['# Backshade stage model, made by scripts/make-models.mts'];
    /** Indexes of the vertices and normals already written, so they are shared */
    private readonly vertices = new Map<string, number>();
    private readonly directions = new Map<string, number>();
    private offset: Vector = [0, 0, 0];
    private lowX = 0;
    private highX = 0;

    /** Width along X of what has been drawn, in meters */
    get width(): number {
        return Number((this.highX - this.lowX).toFixed(2));
    }

    /** Draws with the origin moved by an offset */
    within(offset: Vector, draw: () => void): void {
        const previous = this.offset;
        this.offset = add(previous, offset);
        draw();
        this.offset = previous;
    }

    /** Index of a line "v" or "vn", writing it the first time */
    private index(known: Map<string, number>, line: string): number {
        let value = known.get(line);
        if (value === undefined) {
            value = known.size + 1;
            known.set(line, value);
            this.lines.push(line);
        }
        return value;
    }

    object(name: string): void {
        this.lines.push(`o ${name}`);
    }

    material(name: string): void {
        this.lines.push(`usemtl ${name}`);
    }

    /** Face with its own normals, or flat when they are not given */
    face(points: Vector[], normals?: Vector[]): void {
        const flat = normals === undefined ? unit(cross(sub(points[1], points[0]), sub(points[2], points[0]))) : undefined;
        const corners = points.map((point, index) => {
            const moved = add(point, this.offset);
            this.lowX = Math.min(this.lowX, moved[0]);
            this.highX = Math.max(this.highX, moved[0]);
            return `${this.index(this.vertices, `v ${numbers(moved)}`)}//${this.index(this.directions, `vn ${numbers(normals?.[index] ?? flat ?? point, 2)}`)}`;
        });
        this.lines.push(`f ${corners.join(' ')}`);
    }

    /** Upright solid from its outline seen from above (counterclockwise, X and Z) */
    prism(outline: Array<[number, number]>, bottom: number, top: number): void {
        const low = outline.map(([x, z]): Vector => [x, bottom, z]);
        const high = outline.map(([x, z]): Vector => [x, top, z]);
        outline.forEach((_, index) => {
            const next = (index + 1) % outline.length;
            this.face([low[index], low[next], high[next], high[index]]);
        });
        this.face(high);
        this.face([...low].reverse());
    }

    /** Box from its centre and size */
    box(centre: Vector, size: Vector): void {
        const [x, y, z] = scale(size, 0.5);
        const p = (sx: number, sy: number, sz: number): Vector => add(centre, [sx * x, sy * y, sz * z]);
        this.face([p(-1, -1, 1), p(1, -1, 1), p(1, 1, 1), p(-1, 1, 1)]);
        this.face([p(1, -1, -1), p(-1, -1, -1), p(-1, 1, -1), p(1, 1, -1)]);
        this.face([p(1, -1, 1), p(1, -1, -1), p(1, 1, -1), p(1, 1, 1)]);
        this.face([p(-1, -1, -1), p(-1, -1, 1), p(-1, 1, 1), p(-1, 1, -1)]);
        this.face([p(-1, 1, 1), p(1, 1, 1), p(1, 1, -1), p(-1, 1, -1)]);
        this.face([p(-1, -1, -1), p(1, -1, -1), p(1, -1, 1), p(-1, -1, 1)]);
    }

    /** Cylinder or cone between two points */
    tube(from: Vector, to: Vector, radius: number, segments = 12, endRadius = radius): void {
        const axis = unit(sub(to, from));
        const side = unit(cross(axis, Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
        const other = cross(axis, side);
        const ring = (centre: Vector, r: number): Vector[] => Array.from({ length: segments }, (_, index) => {
            const angle = (index / segments) * Math.PI * 2;
            return add(centre, add(scale(side, Math.cos(angle) * r), scale(other, Math.sin(angle) * r)));
        });
        const start = ring(from, radius);
        const end = ring(to, endRadius);
        const slope = (radius - endRadius) / Math.hypot(...sub(to, from));
        const normals = ring([0, 0, 0], 1).map((out) => unit(add(out, scale(axis, slope))));
        for (let index = 0; index < segments; index++) {
            const next = (index + 1) % segments;
            this.face([start[index], start[next], end[next], end[index]], [normals[index], normals[next], normals[next], normals[index]]);
        }
        this.face([...start].reverse());
        this.face(end);
    }

    /** Sphere made of rings */
    ball(centre: Vector, radius: number, segments = 12, rings = 8): void {
        segments = Math.max(6, Math.round(segments * 0.75));
        rings = Math.max(4, Math.round(rings * 0.75));
        const point = (ring: number, index: number): Vector => {
            const polar = (ring / rings) * Math.PI;
            const around = (index / segments) * Math.PI * 2;
            return add(centre, [radius * Math.sin(polar) * Math.cos(around), radius * Math.cos(polar), -radius * Math.sin(polar) * Math.sin(around)]);
        };
        for (let ring = 0; ring < rings; ring++) {
            for (let index = 0; index < segments; index++) {
                const corners = [point(ring, index), point(ring + 1, index), point(ring + 1, index + 1), point(ring, index + 1)];
                // The caps are triangles
                const points = ring === 0 ? [corners[0], corners[1], corners[2]] : ring === rings - 1 ? [corners[0], corners[1], corners[3]] : corners;
                this.face(points, points.map((corner) => unit(sub(corner, centre))));
            }
        }
    }

    /**
     * Smooth surface through elliptical cross sections, closed at both ends.
     * The sections are perpendicular to the path of their centres, rounded
     * between them, or kept horizontal for upright bodies such as a torso.
     */
    loft(sections: Section[], segments = 14, steps = 3, upright = false): void {
        // Fewer facets and steps than asked keep the files light, with little to see
        segments = Math.max(6, Math.round(segments * 0.75));
        const path = smooth(sections, Math.max(1, steps - 1));
        const rings = path.map((section, index) => {
            const tangent: Vector = upright ? [0, 1, 0] : unit(sub(path[Math.min(index + 1, path.length - 1)].at, path[Math.max(index - 1, 0)].at));
            // The depth of a section faces front, or up for parts that point forward
            const hint: Vector = Math.abs(tangent[2]) < 0.8 ? [0, 0, 1] : [0, -1, 0];
            const side = unit(cross(tangent, hint));
            const front = cross(side, tangent);
            return Array.from({ length: segments }, (_, step) => {
                const angle = (step / segments) * Math.PI * 2;
                return add(section.at, add(scale(side, Math.cos(angle) * section.width), scale(front, Math.sin(angle) * section.depth)));
            });
        });
        const normals = rings.map((ring, r) => ring.map((_, step) => {
            const across = sub(ring[(step + 1) % segments], ring[(step + segments - 1) % segments]);
            const along = sub(rings[Math.min(r + 1, rings.length - 1)][step], rings[Math.max(r - 1, 0)][step]);
            return unit(cross(along, across));
        }));
        for (let r = 0; r < rings.length - 1; r++) {
            for (let step = 0; step < segments; step++) {
                const next = (step + 1) % segments;
                this.face(
                    [rings[r][step], rings[r + 1][step], rings[r + 1][next], rings[r][next]],
                    [normals[r][step], normals[r + 1][step], normals[r + 1][next], normals[r][next]]
                );
            }
        }
        this.face([...rings[0]]);
        this.face([...rings[rings.length - 1]].reverse());
    }

    text(): string {
        return `${this.lines.join('\n')}\n`;
    }
}
