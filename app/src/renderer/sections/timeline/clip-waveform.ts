/**
 * Waveform of an audio clip: the peaks of the part of the file the clip
 * plays (from its offset, for its length), drawn as a shape mirrored around
 * the middle line, with about one point every two pixels.
 */

import { PEAKS_PER_SECOND, type AudioPeaks } from './audio-peaks.js';

const SVG = 'http://www.w3.org/2000/svg';
// Pixels per point of the shape, and most points of one clip
const PIXELS_PER_POINT = 2;
const MAX_POINTS = 4000;

/** Empty waveform element of a clip, filled by drawWaveform */
export function createWaveform(): SVGSVGElement {
    const svg = document.createElementNS(SVG, 'svg');
    svg.classList.add('timeline-clip__waveform');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    return svg;
}

/**
 * Draws the peaks of a clip.
 * @param offset - Time skipped at the beginning of the file, in seconds
 * @param duration - Length of the clip, in seconds
 * @param width - Width of the clip, in pixels
 */
export function drawWaveform(svg: SVGSVGElement, peaks: AudioPeaks, offset: number, duration: number, width: number): void {
    const count = Math.max(1, Math.min(MAX_POINTS, Math.round(width / PIXELS_PER_POINT)));
    const levels: number[] = [];
    for (let index = 0; index < count; index++) {
        const from = Math.floor((offset + (duration * index) / count) * PEAKS_PER_SECOND);
        const to = Math.max(from + 1, Math.floor((offset + (duration * (index + 1)) / count) * PEAKS_PER_SECOND));
        let level = 0;
        for (let peak = from; peak < to && peak < peaks.length; peak++) {
            level = Math.max(level, peaks[peak]);
        }
        levels.push(Math.min(1, level));
    }
    // Upper edge left to right, lower edge back; the viewBox goes from -1 to 1
    const upper = levels.map((level, index) => `${index},${(-level).toFixed(3)} ${index + 1},${(-level).toFixed(3)}`);
    const lower = levels.map((level, index) => `${index + 1},${level.toFixed(3)} ${index},${level.toFixed(3)}`).reverse();
    const shape = document.createElementNS(SVG, 'polygon');
    shape.setAttribute('points', [...upper, ...lower].join(' '));
    svg.setAttribute('viewBox', `0 -1 ${count} 2`);
    svg.replaceChildren(shape);
}
