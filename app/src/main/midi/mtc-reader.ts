/**
 * Reader of MIDI timecode (MTC): quarter frame messages (F1, eight pieces
 * per two frames, while the timecode runs) and full frame messages (system
 * exclusive F0 7F 7F 01 01 hh mm ss ff F7, sent when it is located without
 * running). It gives the time in seconds and whether the timecode runs.
 */

// Frames per second by the rate bits of the hours: 24, 25, 29.97 drop frame (counted as 30), 30
const RATES = [24, 25, 30, 30];

/** Time read from the timecode */
export interface MtcTime {
    seconds: number;
    /** Quarter frames are arriving */
    running: boolean;
    fps: number;
}

export class MtcReader {
    private readonly pieces: number[] = new Array<number>(8).fill(0);
    /** Pieces received in order since piece 0 */
    private received = 0;

    /**
     * Reads a message; null when it gives no time (a piece in the middle, other messages).
     */
    read(data: readonly number[]): MtcTime | null {
        if (data[0] === 0xf1 && data.length >= 2) {
            return this.quarterFrame(data[1] & 0x7f);
        }
        if (data[0] === 0xf0 && data.length >= 10 && data[1] === 0x7f && data[3] === 0x01 && data[4] === 0x01) {
            const fps = RATES[(data[5] >> 5) & 0x03];
            return { seconds: (data[5] & 0x1f) * 3600 + data[6] * 60 + data[7] + data[8] / fps, running: false, fps };
        }
        return null;
    }

    /** True for the messages of the timecode (quarter frames and full frames) */
    static isTimecode(data: readonly number[]): boolean {
        return data[0] === 0xf1 || (data[0] === 0xf0 && data[1] === 0x7f && data[3] === 0x01 && data[4] === 0x01);
    }

    private quarterFrame(byte: number): MtcTime | null {
        const piece = byte >> 4;
        this.pieces[piece] = byte & 0x0f;
        this.received = piece === 0 ? 1 : this.received === piece ? piece + 1 : 0;
        if (piece !== 7 || this.received !== 8) {
            return null;
        }
        const p = this.pieces;
        const fps = RATES[(p[7] >> 1) & 0x03];
        const frames = p[0] | ((p[1] & 0x01) << 4);
        const seconds = p[2] | ((p[3] & 0x03) << 4);
        const minutes = p[4] | ((p[5] & 0x03) << 4);
        const hours = p[6] | ((p[7] & 0x01) << 4);
        // The eight pieces take two frames: the time they carry is two frames old
        return { seconds: hours * 3600 + minutes * 60 + seconds + (frames + 2) / fps, running: true, fps };
    }
}
