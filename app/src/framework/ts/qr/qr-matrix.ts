/**
 * Modules of a QR code (ISO/IEC 18004): finder, timing and alignment
 * patterns, the codewords placed in zigzag, the mask with the lowest
 * penalty and the format information.
 */

import { qrCodewords } from './qr-codewords.js';

/** Square of modules, by row then column: true is dark */
export type QrMatrix = boolean[][];

const MASKS: ReadonlyArray<(x: number, y: number) => boolean> = [
    (x, y) => (x + y) % 2 === 0,
    (_x, y) => y % 2 === 0,
    (x) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
    (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0,
    (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0
];

interface QrSymbol {
    size: number;
    modules: QrMatrix;
    /** Modules of the patterns and of the format, which carry no data and are not masked */
    reserved: boolean[][];
}

function set(symbol: QrSymbol, x: number, y: number, dark: boolean): void {
    if (x >= 0 && y >= 0 && x < symbol.size && y < symbol.size) {
        symbol.modules[y][x] = dark;
        symbol.reserved[y][x] = true;
    }
}

/** Concentric squares around a centre: finder (with its separator) or alignment pattern */
function square(symbol: QrSymbol, cx: number, cy: number, radius: number, light: readonly number[]): void {
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            set(symbol, cx + dx, cy + dy, !light.includes(Math.max(Math.abs(dx), Math.abs(dy))));
        }
    }
}

/** Format information: level M (00) and the mask, with its BCH code */
function drawFormat(symbol: QrSymbol, mask: number): void {
    let remainder = mask;
    for (let i = 0; i < 10; i++) {
        remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
    }
    const bits = ((mask << 10) | remainder) ^ 0x5412;
    const bit = (index: number): boolean => ((bits >>> index) & 1) !== 0;
    const size = symbol.size;
    // First copy, around the top left finder
    for (let i = 0; i <= 5; i++) {
        set(symbol, 8, i, bit(i));
    }
    set(symbol, 8, 7, bit(6));
    set(symbol, 8, 8, bit(7));
    set(symbol, 7, 8, bit(8));
    for (let i = 9; i < 15; i++) {
        set(symbol, 14 - i, 8, bit(i));
    }
    // Second copy, beside the other two finders, with the module that is always dark
    for (let i = 0; i < 8; i++) {
        set(symbol, size - 1 - i, 8, bit(i));
    }
    for (let i = 8; i < 15; i++) {
        set(symbol, 8, size - 15 + i, bit(i));
    }
    set(symbol, 8, size - 8, true);
}

function drawPatterns(version: number): QrSymbol {
    const size = version * 4 + 17;
    const symbol: QrSymbol = {
        size,
        modules: Array.from({ length: size }, () => new Array<boolean>(size).fill(false)),
        reserved: Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
    };
    for (let i = 0; i < size; i++) {
        set(symbol, 6, i, i % 2 === 0);
        set(symbol, i, 6, i % 2 === 0);
    }
    for (const [x, y] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
        square(symbol, x, y, 4, [2, 4]);
    }
    // Versions 2 to 6 have one alignment pattern, near the bottom right corner
    if (version >= 2) {
        square(symbol, size - 7, size - 7, 2, [1]);
    }
    drawFormat(symbol, 0);
    return symbol;
}

/** Places the codewords in columns of two, upwards and downwards, from the right */
function drawData(symbol: QrSymbol, codewords: readonly number[]): void {
    let index = 0;
    for (let right = symbol.size - 1; right >= 1; right -= 2) {
        // The column of the vertical timing pattern is skipped
        if (right === 6) {
            right = 5;
        }
        const upward = ((right + 1) & 2) === 0;
        for (let row = 0; row < symbol.size; row++) {
            const y = upward ? symbol.size - 1 - row : row;
            for (const x of [right, right - 1]) {
                if (!symbol.reserved[y][x] && index < codewords.length * 8) {
                    symbol.modules[y][x] = ((codewords[index >>> 3] >>> (7 - (index & 7))) & 1) !== 0;
                    index++;
                }
            }
        }
    }
}

/** Inverts the data modules chosen by a mask; applied twice it is removed */
function applyMask(symbol: QrSymbol, mask: number): void {
    for (let y = 0; y < symbol.size; y++) {
        for (let x = 0; x < symbol.size; x++) {
            if (!symbol.reserved[y][x] && MASKS[mask](x, y)) {
                symbol.modules[y][x] = !symbol.modules[y][x];
            }
        }
    }
}

/** Penalty of the standard: long runs, blocks, finder-like patterns and balance */
function penalty(modules: QrMatrix): number {
    const size = modules.length;
    let score = 0;
    const lines = [
        ...modules.map((row) => row.map((dark) => dark ? '1' : '0').join('')),
        ...modules.map((_, x) => modules.map((row) => row[x] ? '1' : '0').join(''))
    ];
    for (const line of lines) {
        for (const run of line.match(/0+|1+/g) ?? []) {
            score += run.length >= 5 ? run.length - 2 : 0;
        }
        const padded = `0000${line}0000`;
        for (let i = 0; i + 11 <= padded.length; i++) {
            const part = padded.slice(i, i + 11);
            score += part === '10111010000' || part === '00001011101' ? 40 : 0;
        }
    }
    for (let y = 0; y < size - 1; y++) {
        for (let x = 0; x < size - 1; x++) {
            const dark = modules[y][x];
            score += dark === modules[y][x + 1] && dark === modules[y + 1][x] && dark === modules[y + 1][x + 1] ? 3 : 0;
        }
    }
    const darkCount = modules.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
    return score + Math.floor(Math.abs(darkCount * 20 - size * size * 10) / (size * size)) * 10;
}

/** Modules of the QR code of a text */
export function qrMatrix(text: string): QrMatrix {
    const { version, codewords } = qrCodewords(text);
    const symbol = drawPatterns(version);
    drawData(symbol, codewords);
    let best = 0;
    let lowest = Number.POSITIVE_INFINITY;
    for (let mask = 0; mask < MASKS.length; mask++) {
        applyMask(symbol, mask);
        drawFormat(symbol, mask);
        const score = penalty(symbol.modules);
        if (score < lowest) {
            best = mask;
            lowest = score;
        }
        applyMask(symbol, mask);
    }
    applyMask(symbol, best);
    drawFormat(symbol, best);
    return symbol.modules;
}
