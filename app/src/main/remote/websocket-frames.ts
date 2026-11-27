/**
 * Frames of WebSocket (RFC 6455): the encoding of the server messages and the
 * reading of the client ones, which are always masked. Fragments are joined;
 * messages over the limit and malformed frames are errors.
 */

export const OPCODES = { continuation: 0, text: 1, binary: 2, close: 8, ping: 9, pong: 10 } as const;

/** Largest message accepted from a client */
export const MAX_MESSAGE_BYTES = 8 * 1024 * 1024;

/** Frame or reassembled message */
export interface Frame {
    opcode: number;
    payload: Buffer;
}

/** Error of the protocol, with the close code to answer */
export class WebSocketError extends Error {
    readonly code: number;

    constructor(code: number, message: string) {
        super(message);
        this.code = code;
    }
}

/** Server frame: final, not masked */
export function encodeFrame(opcode: number, payload: Buffer): Buffer {
    const length = payload.length;
    const extended = length < 126 ? 0 : length <= 0xffff ? 2 : 8;
    const header = Buffer.alloc(2 + extended);
    header[0] = 0x80 | opcode;
    if (extended === 0) {
        header[1] = length;
    } else if (extended === 2) {
        header[1] = 126;
        header.writeUInt16BE(length, 2);
    } else {
        header[1] = 127;
        header.writeBigUInt64BE(BigInt(length), 2);
    }
    return Buffer.concat([header, payload]);
}

/** Reads the client frames from the bytes received */
export class FrameReader {
    private buffer: Buffer = Buffer.alloc(0);
    private fragments: Buffer[] = [];
    private fragmentOpcode = 0;
    private fragmentBytes = 0;

    /**
     * Adds received bytes and returns the complete messages and control frames.
     * @throws WebSocketError on a protocol violation
     */
    push(chunk: Buffer): Frame[] {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        const frames: Frame[] = [];
        for (let frame = this.next(); frame !== null; frame = this.next()) {
            const message = this.assemble(frame.fin, frame.opcode, frame.payload);
            if (message !== null) {
                frames.push(message);
            }
        }
        return frames;
    }

    private next(): { fin: boolean; opcode: number; payload: Buffer } | null {
        const data = this.buffer;
        if (data.length < 2) {
            return null;
        }
        const fin = (data[0] & 0x80) !== 0;
        const opcode = data[0] & 0x0f;
        if ((data[0] & 0x70) !== 0) {
            throw new WebSocketError(1002, 'Reserved bits set');
        }
        if ((data[1] & 0x80) === 0) {
            throw new WebSocketError(1002, 'Client frame not masked');
        }
        let length = data[1] & 0x7f;
        let offset = 2;
        if (length === 126) {
            if (data.length < 4) {
                return null;
            }
            length = data.readUInt16BE(2);
            offset = 4;
        } else if (length === 127) {
            if (data.length < 10) {
                return null;
            }
            const big = data.readBigUInt64BE(2);
            if (big > BigInt(MAX_MESSAGE_BYTES)) {
                throw new WebSocketError(1009, 'Message too large');
            }
            length = Number(big);
            offset = 10;
        }
        if (opcode >= 8 && (!fin || length > 125)) {
            throw new WebSocketError(1002, 'Invalid control frame');
        }
        if (length > MAX_MESSAGE_BYTES) {
            throw new WebSocketError(1009, 'Message too large');
        }
        if (data.length < offset + 4 + length) {
            return null;
        }
        const mask = data.subarray(offset, offset + 4);
        const payload = Buffer.from(data.subarray(offset + 4, offset + 4 + length));
        for (let index = 0; index < payload.length; index++) {
            payload[index] ^= mask[index & 3];
        }
        this.buffer = data.subarray(offset + 4 + length);
        return { fin, opcode, payload };
    }

    private assemble(fin: boolean, opcode: number, payload: Buffer): Frame | null {
        // Control frames may come between the fragments of a message
        if (opcode >= 8) {
            return { opcode, payload };
        }
        const continuation = opcode === OPCODES.continuation;
        if (continuation === (this.fragments.length === 0)) {
            throw new WebSocketError(1002, 'Unexpected fragment');
        }
        if (!continuation) {
            this.fragmentOpcode = opcode;
        }
        this.fragments.push(payload);
        this.fragmentBytes += payload.length;
        if (this.fragmentBytes > MAX_MESSAGE_BYTES) {
            throw new WebSocketError(1009, 'Message too large');
        }
        if (!fin) {
            return null;
        }
        const message = { opcode: this.fragmentOpcode, payload: Buffer.concat(this.fragments) };
        this.fragments = [];
        this.fragmentBytes = 0;
        return message;
    }
}
