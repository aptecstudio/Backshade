/**
 * Peaks of the audio files of the show, for the waveforms of the timeline
 * clips. A file is read from the show media and decoded once with Web Audio
 * at a low sample rate; its peaks (highest level of every channel, a fixed
 * number per second) are kept in memory for the running session. The key of
 * a file includes its size and date, so a file replaced on disk is read again.
 */

import { SHOW_MEDIA_ROUTE } from '../../../shared/audio/playback-protocol.js';
import type { MediaItem } from '../../../shared/transport/engine-api.js';

/** Peaks per second of audio */
export const PEAKS_PER_SECOND = 100;

// Sample rate of the decoding: enough for the shape, light on memory
const DECODE_RATE = 11025;

/** Peaks of a file: values 0 to 1, PEAKS_PER_SECOND per second */
export type AudioPeaks = Float32Array;

const loading = new Map<string, Promise<AudioPeaks | null>>();
const ready = new Map<string, AudioPeaks | null>();

/** Key of a media file in the cache */
export function peaksKey(item: Pick<MediaItem, 'file' | 'size' | 'modifiedAt'>): string {
    return `${item.file}|${item.size}|${item.modifiedAt}`;
}

/** Peaks already read, undefined while they are not ready, null when the file cannot be read */
export function peaksNow(key: string): AudioPeaks | null | undefined {
    return ready.get(key);
}

/**
 * Peaks of a file, read the first time they are asked.
 * @param file - Path relative to the media folder
 */
export function loadPeaks(key: string, file: string): Promise<AudioPeaks | null> {
    let promise = loading.get(key);
    if (promise === undefined) {
        promise = decode(file).catch(() => null).then((peaks) => {
            ready.set(key, peaks);
            return peaks;
        });
        loading.set(key, promise);
    }
    return promise;
}

async function decode(file: string): Promise<AudioPeaks | null> {
    const response = await fetch(SHOW_MEDIA_ROUTE + file.split('/').map(encodeURIComponent).join('/'));
    if (!response.ok) {
        return null;
    }
    const context = new OfflineAudioContext(1, 1, DECODE_RATE);
    const buffer = await context.decodeAudioData(await response.arrayBuffer());
    const block = Math.max(1, Math.round(buffer.sampleRate / PEAKS_PER_SECOND));
    const peaks = new Float32Array(Math.ceil(buffer.length / block));
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const samples = buffer.getChannelData(channel);
        for (let index = 0; index < samples.length; index++) {
            const level = Math.abs(samples[index]);
            const peak = Math.floor(index / block);
            if (level > peaks[peak]) {
                peaks[peak] = level;
            }
        }
    }
    return peaks;
}
