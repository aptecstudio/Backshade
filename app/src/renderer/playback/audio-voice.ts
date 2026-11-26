/**
 * One playing file of the playback window: an audio element through its
 * own gain into the output, between a start and an end time, with fades,
 * volume and repeat. It reports its position a few times per second and
 * its end.
 */

import type { PlaybackCommand, PlaybackStatus } from '../../shared/audio/playback-protocol.js';

/** Play command of a voice */
export type PlayCommand = Extract<PlaybackCommand, { type: 'play' }>;

// Checks of the position, and least time between two position reports
const CHECK_MS = 50;
const REPORT_MS = 250;

export class AudioVoice {
    readonly id: string;
    private readonly command: PlayCommand;
    private readonly context: AudioContext;
    private readonly element: HTMLAudioElement;
    private readonly gain: GainNode;
    private readonly report: (status: PlaybackStatus) => void;
    private timer: number | null = null;
    private lastReport = 0;
    private fadingOut = false;
    private finished = false;

    constructor(command: PlayCommand, context: AudioContext, output: AudioNode, report: (status: PlaybackStatus) => void) {
        this.id = command.voice;
        this.command = command;
        this.context = context;
        this.report = report;
        this.element = new Audio();
        this.element.preload = 'auto';
        this.element.src = command.url;
        this.gain = context.createGain();
        this.gain.gain.value = 0;
        context.createMediaElementSource(this.element).connect(this.gain);
        this.gain.connect(output);
        this.element.addEventListener('error', () => this.fail('The file cannot be played'));
        this.element.addEventListener('loadedmetadata', () => void this.begin(), { once: true });
    }

    pause(): void {
        this.element.pause();
    }

    resume(): void {
        void this.element.play().catch(() => this.fail('Playback refused'));
    }

    /**
     * Changes the volume, with a short ramp.
     */
    setVolume(volume: number, ramp: number): void {
        const now = this.context.currentTime;
        this.gain.gain.cancelScheduledValues(now);
        this.gain.gain.setValueAtTime(this.gain.gain.value, now);
        this.gain.gain.linearRampToValueAtTime(volume, now + Math.max(0.01, ramp));
    }

    /**
     * Fades out and stops.
     */
    stop(fade: number): void {
        if (this.finished) {
            return;
        }
        this.finished = true;
        this.setVolume(0, fade);
        window.setTimeout(() => this.dispose(), Math.max(0.01, fade) * 1000 + 50);
    }

    private async begin(): Promise<void> {
        this.element.currentTime = this.command.start;
        try {
            await this.context.resume();
            await this.element.play();
        } catch {
            this.fail('Playback refused');
            return;
        }
        this.setVolume(this.command.volume, this.command.fadeIn);
        this.timer = window.setInterval(() => this.check(), CHECK_MS);
    }

    /**
     * Follows the position: fade out before the end, repeat or end.
     */
    private check(): void {
        if (this.finished) {
            return;
        }
        const position = this.element.currentTime;
        const end = this.command.end ?? this.element.duration;
        if (Number.isFinite(end)) {
            const fadeStart = end - this.command.fadeOut;
            if (!this.command.loop && !this.fadingOut && this.command.fadeOut > 0 && position >= fadeStart) {
                this.fadingOut = true;
                this.setVolume(0, Math.max(0.01, end - position));
            }
            if (position >= end || this.element.ended) {
                if (this.command.loop) {
                    this.element.currentTime = this.command.start;
                    void this.element.play();
                } else {
                    this.finished = true;
                    this.report({ type: 'ended', voice: this.id });
                    this.dispose();
                    return;
                }
            }
        }
        const now = performance.now();
        if (now - this.lastReport >= REPORT_MS) {
            this.lastReport = now;
            this.report({ type: 'position', voice: this.id, position, duration: Number.isFinite(this.element.duration) ? this.element.duration : 0 });
        }
    }

    private fail(message: string): void {
        if (!this.finished) {
            this.finished = true;
            this.report({ type: 'error', voice: this.id, message });
            this.dispose();
        }
    }

    private dispose(): void {
        if (this.timer !== null) {
            window.clearInterval(this.timer);
            this.timer = null;
        }
        this.element.pause();
        this.element.removeAttribute('src');
        this.element.load();
        this.gain.disconnect();
    }
}
