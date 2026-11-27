/**
 * Vector operations of the model scripts.
 */

export type Vector = [number, number, number];
export const add = (a: Vector, b: Vector): Vector => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vector, b: Vector): Vector => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vector, s: number): Vector => [a[0] * s, a[1] * s, a[2] * s];
export const cross = (a: Vector, b: Vector): Vector => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const unit = (a: Vector): Vector => scale(a, 1 / Math.hypot(...a));
