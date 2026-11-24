/**
 * Art-Net 4 packets used by Backshade: ArtDmx (DMX data of one universe),
 * ArtPoll (search of the nodes) and ArtPollReply (answer of a node).
 * Multi-byte fields are little-endian except where the protocol says otherwise.
 */

/** UDP port of Art-Net */
export const ARTNET_PORT = 6454;

const ID = Buffer.from('Art-Net\0', 'ascii');
const PROTOCOL_VERSION = 14;

const OP_POLL = 0x2000;
const OP_POLL_REPLY = 0x2100;
const OP_DMX = 0x5000;

/** Node that answered an ArtPoll */
export interface ArtNetNode {
    /** IPv4 address of the node */
    address: string;
    shortName: string;
    longName: string;
    /** Port-Addresses of the output ports of the node */
    portAddresses: number[];
}

function header(opCode: number, size: number): Buffer {
    const buffer = Buffer.alloc(size);
    ID.copy(buffer, 0);
    buffer.writeUInt16LE(opCode, 8);
    buffer.writeUInt16BE(PROTOCOL_VERSION, 10);
    return buffer;
}

/**
 * ArtDmx packet with the 512 channels of a universe.
 * @param sequence - 1 to 255, increased at every packet of the universe, so nodes can reorder them
 */
export function artDmx(portAddress: number, sequence: number, data: Uint8Array): Buffer {
    // The data length is even, from 2 to 512
    const length = Math.max(2, Math.min(512, data.length + (data.length % 2)));
    const packet = header(OP_DMX, 18 + length);
    packet.writeUInt8(sequence, 12);
    packet.writeUInt8(0, 13);
    packet.writeUInt8(portAddress & 0xff, 14);
    packet.writeUInt8((portAddress >> 8) & 0x7f, 15);
    packet.writeUInt16BE(length, 16);
    packet.set(data.subarray(0, length), 18);
    return packet;
}

/**
 * ArtPoll packet: asks the nodes of the network to answer with an ArtPollReply.
 */
export function artPoll(): Buffer {
    const packet = header(OP_POLL, 14);
    // Flags: no reply on change, no diagnostics; priority 0
    packet.writeUInt8(0, 12);
    packet.writeUInt8(0, 13);
    return packet;
}

function readText(packet: Buffer, start: number, length: number): string {
    const raw = packet.subarray(start, start + length);
    const end = raw.indexOf(0);
    return raw.subarray(0, end === -1 ? raw.length : end).toString('latin1').replace(/[^\x20-\x7e]/g, '').trim();
}

/**
 * Reads an ArtPollReply; returns null for any other packet.
 */
export function parsePollReply(packet: Buffer): ArtNetNode | null {
    if (packet.length < 207 || !packet.subarray(0, 8).equals(ID) || packet.readUInt16LE(8) !== OP_POLL_REPLY) {
        return null;
    }
    const address = [...packet.subarray(10, 14)].join('.');
    const net = packet.readUInt8(18) & 0x7f;
    const subNet = packet.readUInt8(19) & 0x0f;
    const ports = Math.min(4, packet.readUInt16BE(172));
    const portAddresses: number[] = [];
    for (let index = 0; index < ports; index++) {
        // Port types: bit 7 means the port can output data from Art-Net
        if ((packet.readUInt8(174 + index) & 0x80) !== 0) {
            portAddresses.push((net << 8) | (subNet << 4) | (packet.readUInt8(190 + index) & 0x0f));
        }
    }
    return {
        address,
        shortName: readText(packet, 26, 18),
        longName: readText(packet, 44, 64),
        portAddresses
    };
}
