/**
 * Progress bar of the cue list (fade in or follow wait). The engine sends
 * the elapsed and total time at each change; the bar moves on with the
 * clock of this window, so it needs no event while it runs.
 */

import { Component, create, Label, Stack, formatDuration } from '../../../framework/ts/index.js';
import type { CueTiming } from '../../../shared/console/cue-stack.js';

export class CueProgress extends Stack {
    private readonly bar: HTMLDivElement;
    private readonly time: Label;
    private timing: CueTiming | null = null;
    private running = false;
    private receivedAt = 0;
    private frame = 0;

    constructor(caption: string) {
        super({ gap: 8, classes: ['cue-progress'] });
        this.bar = create('div', { classes: ['cue-progress__fill'] });
        this.time = new Label({ text: '', tone: 'secondary', size: 'small' });
        const track = new BarTrack(this.bar);
        this.append(
            new Stack({ direction: 'row', gap: 8, classes: ['cue-progress__head'], children: [new Label({ text: caption, size: 'small' }), this.time] }),
            track
        );
        this.track(() => cancelAnimationFrame(this.frame));
        this.render();
    }

    /**
     * Shows a timing; it runs unless paused.
     */
    setTiming(timing: CueTiming | null, running: boolean): void {
        this.timing = timing;
        this.running = running;
        this.receivedAt = performance.now();
        cancelAnimationFrame(this.frame);
        this.render();
    }

    private render(): void {
        const timing = this.timing;
        if (timing === null) {
            this.bar.style.setProperty('--cue-progress', '0');
            this.time.setText('');
            return;
        }
        const elapsed = Math.min(timing.duration, timing.elapsed + (this.running ? performance.now() - this.receivedAt : 0));
        const progress = timing.duration <= 0 ? 1 : elapsed / timing.duration;
        this.bar.style.setProperty('--cue-progress', String(progress));
        this.time.setText(formatDuration((timing.duration - elapsed) / 1000));
        if (this.running && progress < 1) {
            this.frame = requestAnimationFrame(() => this.render());
        }
    }
}

/** Track of the bar, holding the fill */
class BarTrack extends Component<HTMLDivElement> {
    constructor(fill: HTMLDivElement) {
        super(create('div', { classes: ['cue-progress__track'], children: [fill] }));
    }
}
