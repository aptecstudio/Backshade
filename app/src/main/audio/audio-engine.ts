/**
 * Audio player of the show: plays one item of the playlist at a time in
 * the playback window, with its start and end times, fades, volume and
 * repeat; a new item crossfades with the one playing. At the end of an
 * item started by the keys, the next one starts when auto advance is on.
 * Scenes and cues start their item with their own fades and stop it when
 * they turn off; a scene fader scales its volume.
 */

import { randomUUID } from 'node:crypto';
import type { AudioDevice, AudioItem, AudioPlayback, ShowAudio } from '../../shared/audio/audio';
import type { VideoInput } from '../../shared/video/video';
import { SHOW_MEDIA_ROUTE, type PlaybackStatus } from '../../shared/audio/playback-protocol';
import type { PlaybackWindow } from '../playback/playback-window';
import * as appProtocol from '../protocol/app-protocol';

/** Bus of the audio player in the playback window */
export const PLAYER_BUS = 'player';

// Least time between two position updates sent to the interface
const STATE_INTERVAL_MS = 250;

interface Voice {
    id: string;
    item: AudioItem;
    /** Key of the scene or cue that started it, null for the player keys */
    scene: string | null;
    paused: boolean;
    position: number;
    duration: number;
}

export class AudioEngine {
    private readonly window: PlaybackWindow;
    private readonly audio: () => ShowAudio | null;
    private readonly onState: (state: AudioPlayback) => void;
    private current: Voice | null = null;
    private lastState = 0;
    private deviceRequest = 0;
    private readonly deviceAnswers = new Map<number, (devices: AudioDevice[]) => void>();
    private readonly inputAnswers = new Map<number, (inputs: VideoInput[]) => void>();

    /**
     * @param audio - Audio of the open show, null when no show is open
     * @param onState - Called when the playback changes, and with the position a few times per second
     */
    constructor(window: PlaybackWindow, audio: () => ShowAudio | null, onState: (state: AudioPlayback) => void) {
        this.window = window;
        this.audio = audio;
        this.onState = onState;
        window.onStatus((status) => this.receive(status));
    }

    state(): AudioPlayback {
        const voice = this.current;
        return {
            item: voice?.item.id ?? null,
            paused: voice?.paused ?? false,
            position: voice?.position ?? 0,
            duration: voice?.duration ?? 0,
            fromScene: voice?.scene !== null && voice !== null
        };
    }

    /** Audio outputs of the computer */
    devices(): Promise<AudioDevice[]> {
        const request = ++this.deviceRequest;
        return new Promise((resolve) => {
            this.deviceAnswers.set(request, resolve);
            this.window.send({ type: 'listDevices', request });
            // Without an answer (no window) the list is empty
            setTimeout(() => {
                if (this.deviceAnswers.delete(request)) {
                    resolve([]);
                }
            }, 3000);
        });
    }

    /**
     * Video inputs of the computer (cameras, capture cards), listed by the playback window.
     */
    videoInputs(): Promise<VideoInput[]> {
        const request = ++this.deviceRequest;
        return new Promise((resolve) => {
            this.inputAnswers.set(request, resolve);
            this.window.send({ type: 'listVideoInputs', request });
            setTimeout(() => {
                if (this.inputAnswers.delete(request)) {
                    resolve([]);
                }
            }, 3000);
        });
    }

    /**
     * Applies the output and the volume of the player.
     */
    applyOutput(): void {
        const audio = this.audio();
        this.window.send({ type: 'output', bus: PLAYER_BUS, device: audio?.device ?? '', volume: audio?.volume ?? 1 });
    }

    /**
     * Plays an item; the one playing fades out with its own fade.
     * @param fadeIn - Fade in seconds instead of the fade of the item (scenes)
     * @param scene - Key of the scene or cue that starts it
     */
    play(itemId: string, fadeIn: number | null = null, scene: string | null = null, volume = 1): void {
        const item = this.audio()?.items.find((entry) => entry.id === itemId);
        if (item === undefined) {
            return;
        }
        this.stop();
        const voice: Voice = { id: randomUUID(), item, scene, paused: false, position: item.start, duration: 0 };
        this.current = voice;
        this.window.send({
            type: 'play',
            voice: voice.id,
            bus: PLAYER_BUS,
            url: appProtocol.pageUrl(SHOW_MEDIA_ROUTE.slice(1) + item.file.split('/').map(encodeURIComponent).join('/')),
            start: item.start,
            end: item.end,
            loop: item.loop,
            volume: item.volume * volume,
            fadeIn: fadeIn ?? item.fadeIn,
            fadeOut: item.fadeOut
        });
        this.announce();
    }

    /**
     * Stops the item playing, with its fade out or the given one.
     */
    stop(fade: number | null = null): void {
        const voice = this.current;
        if (voice === null) {
            return;
        }
        this.window.send({ type: 'stop', voice: voice.id, fade: voice.paused ? 0 : fade ?? voice.item.fadeOut });
        this.current = null;
        this.announce();
    }

    /** Pauses or resumes the item playing */
    togglePause(): void {
        const voice = this.current;
        if (voice === null) {
            return;
        }
        voice.paused = !voice.paused;
        this.window.send({ type: voice.paused ? 'pause' : 'resume', voice: voice.id });
        this.announce();
    }

    /**
     * Plays the next (1) or previous (-1) item of the playlist; from stop, the first one.
     */
    step(direction: 1 | -1): void {
        const items = this.audio()?.items ?? [];
        const index = items.findIndex((item) => item.id === this.current?.item.id);
        const next = index < 0 ? items[0] : items[index + direction];
        if (next !== undefined) {
            this.play(next.id);
        }
    }

    /**
     * Stops at once, for example when the show is closed.
     */
    reset(): void {
        this.stop(0);
    }

    /** Scene or cue turned on: plays its item with the fade of the scene */
    startFromScene(scene: string, itemId: string, fadeIn: number, level = 1): void {
        this.play(itemId, fadeIn, scene, level);
    }

    /** Scene or cue turned off: stops its item if it is still playing it */
    stopFromScene(scene: string, fadeOut: number): void {
        if (this.current?.scene === scene) {
            this.stop(fadeOut);
        }
    }

    /** Fader of a scene: volume of its item */
    levelFromScene(scene: string, level: number): void {
        const voice = this.current;
        if (voice?.scene === scene) {
            this.window.send({ type: 'volume', voice: voice.id, volume: voice.item.volume * level, ramp: 0.05 });
        }
    }

    private receive(status: PlaybackStatus): void {
        switch (status.type) {
            case 'ready':
                this.applyOutput();
                break;
            case 'videoInputs':
                this.inputAnswers.get(status.request)?.(status.inputs);
                this.inputAnswers.delete(status.request);
                break;
            case 'devices':
                this.deviceAnswers.get(status.request)?.(status.devices);
                this.deviceAnswers.delete(status.request);
                break;
            case 'position':
                if (this.current?.id === status.voice) {
                    this.current.position = status.position;
                    this.current.duration = status.duration;
                    if (Date.now() - this.lastState >= STATE_INTERVAL_MS) {
                        this.announce();
                    }
                }
                break;
            case 'ended':
            case 'error':
                if (this.current?.id === status.voice) {
                    const ended = this.current;
                    this.current = null;
                    const items = this.audio()?.items ?? [];
                    const next = items[items.findIndex((item) => item.id === ended.item.id) + 1];
                    if (status.type === 'ended' && ended.scene === null && this.audio()?.autoAdvance === true && next !== undefined) {
                        this.play(next.id);
                    } else {
                        this.announce();
                    }
                }
                break;
        }
    }

    private announce(): void {
        this.lastState = Date.now();
        this.onState(this.state());
    }
}
