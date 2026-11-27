/**
 * Reed-Solomon error correction over GF(256) with the polynomial 0x11D, as
 * used by QR codes.
 */

function multiply(a: number, b: number): number {
    let result = 0;
    for (let bit = 7; bit >= 0; bit--) {
        result = (result << 1) ^ ((result >>> 7) * 0x11d);
        result ^= ((b >>> bit) & 1) * a;
    }
    return result;
}

/** Generator polynomial of a degree, without its leading 1 */
function generator(degree: number): number[] {
    const result = new Array<number>(degree).fill(0);
    result[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
        for (let j = 0; j < degree; j++) {
            result[j] = multiply(result[j], root) ^ (result[j + 1] ?? 0);
        }
        root = multiply(root, 2);
    }
    return result;
}

/** Error correction codewords of a block */
export function errorCorrection(data: readonly number[], count: number): number[] {
    const divisor = generator(count);
    const remainder = new Array<number>(count).fill(0);
    for (const byte of data) {
        const factor = byte ^ (remainder.shift() ?? 0);
        remainder.push(0);
        divisor.forEach((value, index) => {
            remainder[index] ^= multiply(value, factor);
        });
    }
    return remainder;
}
