/**
 * Audio clips of a timeline: one voice per playing clip in the playback
 * window, on the bus of its track (output device and volume of the track).
 * A clip that starts while playback is already past its start plays from
 * the right point of its file.
 */

import { randomUUID } from 'node:crypto';
import { SHOW_MEDIA_ROUTE } from '../../shared/audio/playback-protocol';
import type { Clip, Timeline, Track } from '../../shared/timeline/timeline';
import type { PlaybackWindow } from '../playback/playback-window';
import * as appProtocol from '../protocol/app-protocol';

/** Bus of an audio track */
export function trackBus(track: Pick<Track, 'id'>): string {
    return `track:${track.id}`;
}

export class TimelineAudio {
    private readonly window: PlaybackWindow;
    /** Clip identifier -> voice */
    private readonly voices = new Map<string, string>();

    constructor(window: PlaybackWindow) {
        this.window = window;
    }

    /** The clip is playing */
    has(clipId: string): boolean {
        return this.voices.has(clipId);
    }

    /** Clips playing */
    playing(): string[] {
        return [...this.voices.keys()];
    }

    /**
     * Applies output device and volume of every audio track; a muted track is silent.
     */
    applyOutputs(timeline: Timeline, muted: (track: Track) => boolean): void {
        for (const track of timeline.tracks) {
            if (track.kind === 'audio') {
                this.window.send({ type: 'output', bus: trackBus(track), device: track.device, volume: muted(track) ? 0 : track.volume });
            }
        }
    }

    /**
     * Plays a clip from a time on the timeline.
     */
    start(track: Track, clip: Clip, position: number): void {
        if (clip.source.kind !== 'audio') {
            return;
        }
        const inside = Math.max(0, position - clip.start);
        const voice = randomUUID();
        this.voices.set(clip.id, voice);
        this.window.send({
            type: 'play',
            voice,
            bus: trackBus(track),
            url: appProtocol.pageUrl(SHOW_MEDIA_ROUTE.slice(1) + clip.source.file.split('/').map(encodeURIComponent).join('/')),
            start: clip.offset + inside,
            end: clip.offset + clip.duration,
            loop: false,
            volume: clip.source.volume,
            fadeIn: Math.max(0, clip.fadeIn - inside),
            fadeOut: Math.min(clip.fadeOut, clip.duration - inside)
        });
    }

    /** Stops a clip, with a short fade so it does not click */
    stop(clipId: string): void {
        const voice = this.voices.get(clipId);
        if (voice !== undefined) {
            this.window.send({ type: 'stop', voice, fade: 0.03 });
            this.voices.delete(clipId);
        }
    }

    stopAll(): void {
        for (const clipId of [...this.voices.keys()]) {
            this.stop(clipId);
        }
    }
}
