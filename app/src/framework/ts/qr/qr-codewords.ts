/**
 * Codewords of a QR code: the text in byte mode, padded to the capacity of
 * the smallest version that holds it, split in blocks, each with its error
 * correction, and interleaved. Error correction level M, versions 1 to 6
 * (up to 106 bytes, far more than a network address).
 */

import { errorCorrection } from './reed-solomon.js';

/** Data codewords, blocks and error correction codewords per block of versions 1 to 6, level M */
const VERSIONS: ReadonlyArray<{ data: number; blocks: number; correction: number }> = [
    { data: 16, blocks: 1, correction: 10 },
    { data: 28, blocks: 1, correction: 16 },
    { data: 44, blocks: 1, correction: 26 },
    { data: 64, blocks: 2, correction: 18 },
    { data: 86, blocks: 2, correction: 24 },
    { data: 108, blocks: 4, correction: 16 }
];

/** Version and codewords, in the order they go into the symbol */
export function qrCodewords(text: string): { version: number; codewords: number[] } {
    const bytes = new TextEncoder().encode(text);
    // Mode (4 bits), length (8 bits) and the bytes
    const index = VERSIONS.findIndex((version) => 12 + bytes.length * 8 <= version.data * 8);
    if (index < 0) {
        throw new Error('Text too long for a QR code');
    }
    const { data, blocks, correction } = VERSIONS[index];
    const bits: number[] = [];
    const push = (value: number, length: number): void => {
        for (let bit = length - 1; bit >= 0; bit--) {
            bits.push((value >>> bit) & 1);
        }
    };
    push(0b0100, 4);
    push(bytes.length, 8);
    bytes.forEach((byte) => push(byte, 8));
    // Terminator, then zeros to a whole byte, then the padding bytes of the standard
    push(0, Math.min(4, data * 8 - bits.length));
    push(0, (8 - bits.length % 8) % 8);
    for (let pad = 0xec; bits.length < data * 8; pad ^= 0xec ^ 0x11) {
        push(pad, 8);
    }
    const words = Array.from({ length: data }, (_, word) => bits.slice(word * 8, word * 8 + 8).reduce((value, bit) => (value << 1) | bit, 0));

    // Versions 1 to 6 at level M have blocks of the same size
    const size = data / blocks;
    const parts = Array.from({ length: blocks }, (_, block) => words.slice(block * size, (block + 1) * size));
    const checks = parts.map((part) => errorCorrection(part, correction));
    const codewords: number[] = [];
    for (let i = 0; i < size; i++) {
        parts.forEach((part) => codewords.push(part[i]));
    }
    for (let i = 0; i < correction; i++) {
        checks.forEach((check) => codewords.push(check[i]));
    }
    return { version: index + 1, codewords };
}
