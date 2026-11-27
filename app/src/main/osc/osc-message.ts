/**
 * Encoding of OSC 1.0 messages: address, type tags and arguments (32-bit
 * integers, 32-bit floats, strings), each part padded to four bytes, big
 * endian. Native Node.js, no dependency.
 */

/** Argument of a message */
export type OscArgument = { type: 'i'; value: number } | { type: 'f'; value: number } | { type: 's'; value: string };

/** OSC string: ASCII text ended by at least one zero byte, padded to four bytes */
function oscString(value: string): Buffer {
    const bytes = Buffer.from(value, 'ascii');
    const size = Math.ceil((bytes.length + 1) / 4) * 4;
    const buffer = Buffer.alloc(size);
    bytes.copy(buffer);
    return buffer;
}

/**
 * Encodes a message.
 * @param address - OSC address, starting with "/"
 */
export function encodeOscMessage(address: string, args: readonly OscArgument[] = []): Buffer {
    const parts = [oscString(address), oscString(`,${args.map((arg) => arg.type).join('')}`)];
    for (const arg of args) {
        if (arg.type === 's') {
            parts.push(oscString(arg.value));
        } else {
            const buffer = Buffer.alloc(4);
            if (arg.type === 'i') {
                buffer.writeInt32BE(Math.trunc(arg.value));
            } else {
                buffer.writeFloatBE(arg.value);
            }
            parts.push(buffer);
        }
    }
    return Buffer.concat(parts);
}
