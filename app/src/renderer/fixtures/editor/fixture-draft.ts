/**
 * Working copy of a definition in the fixture editor. It keeps the
 * channel references consistent (modes and fine channels follow
 * removed channels) and notifies the structural changes, so the
 * editor panels can be rebuilt. Name and value edits do not notify.
 */

import { Emitter, type Unsubscribe } from '../../../framework/ts/index.js';
import {
    FIXTURE_FORMAT_VERSION,
    type FixtureCapability,
    type FixtureChannel,
    type FixtureDefinition,
    type FixtureMode
} from '../../../shared/fixtures/fixture-definition.js';

/**
 * Empty definition for a new fixture.
 */
function emptyDefinition(): FixtureDefinition {
    return { formatVersion: FIXTURE_FORMAT_VERSION, manufacturer: '', model: '', category: 'par', channels: [], modes: [] };
}

export class FixtureDraft {
    readonly definition: FixtureDefinition;
    private readonly structure = new Emitter<void>();
    private readonly initial: string;

    constructor(source: FixtureDefinition | null) {
        this.definition = structuredClone(source ?? emptyDefinition());
        this.initial = JSON.stringify(this.definition);
    }

    /** The draft differs from the definition it was created from */
    get changed(): boolean {
        return JSON.stringify(this.definition) !== this.initial;
    }

    /**
     * Registers a listener for added, removed or reordered channels and modes.
     */
    onStructureChange(listener: () => void): Unsubscribe {
        return this.structure.subscribe(listener);
    }

    /** Channel with a key */
    channel(key: string): FixtureChannel | undefined {
        return this.definition.channels.find((channel) => channel.key === key);
    }

    /**
     * Adds a channel with a new key and returns it.
     */
    addChannel(name: string): FixtureChannel {
        const keys = new Set(this.definition.channels.map((channel) => channel.key));
        let index = this.definition.channels.length + 1;
        while (keys.has(`channel${index}`)) {
            index++;
        }
        const channel: FixtureChannel = { key: `channel${index}`, name, attribute: 'dimmer' };
        this.definition.channels.push(channel);
        this.structure.emit();
        return channel;
    }

    /**
     * Removes a channel from the definition, from the modes and from the fine channels that referred to it.
     */
    removeChannel(key: string): void {
        this.definition.channels = this.definition.channels.filter((channel) => channel.key !== key);
        for (const channel of this.definition.channels) {
            if (channel.fineOf === key) {
                delete channel.fineOf;
            }
        }
        for (const mode of this.definition.modes) {
            mode.channels = mode.channels.filter((item) => item !== key);
            if (mode.heads !== undefined) {
                mode.heads = mode.heads.map((head) => head.filter((item) => item !== key)).filter((head) => head.length > 0);
                if (mode.heads.length === 0) {
                    delete mode.heads;
                }
            }
        }
        this.structure.emit();
    }

    /**
     * Makes a channel the fine channel of another one, or an 8 bit channel with null.
     * Channels that were fine channels of this one become 8 bit channels.
     */
    setFineOf(key: string, coarse: string | null): void {
        const channel = this.channel(key);
        if (channel === undefined) {
            return;
        }
        if (coarse === null) {
            delete channel.fineOf;
        } else {
            channel.fineOf = coarse;
            for (const other of this.definition.channels) {
                if (other.fineOf === key) {
                    delete other.fineOf;
                }
            }
        }
        this.structure.emit();
    }

    /**
     * Replaces the capabilities of a channel; an empty list removes them.
     */
    setCapabilities(key: string, capabilities: readonly FixtureCapability[]): void {
        const channel = this.channel(key);
        if (channel === undefined) {
            return;
        }
        if (capabilities.length === 0) {
            delete channel.capabilities;
        } else {
            channel.capabilities = capabilities.map((capability) => ({ ...capability }));
        }
        this.structure.emit();
    }

    /**
     * Adds a mode with all the channels, in their order, and returns it.
     */
    addMode(name: string): FixtureMode {
        const mode: FixtureMode = { name, channels: this.definition.channels.map((channel) => channel.key) };
        this.definition.modes.push(mode);
        this.structure.emit();
        return mode;
    }

    /**
     * Removes a mode.
     */
    removeMode(mode: FixtureMode): void {
        this.definition.modes = this.definition.modes.filter((item) => item !== mode);
        this.structure.emit();
    }

    /**
     * Replaces the channels of a mode; cells that use removed channels are dropped.
     */
    setModeChannels(mode: FixtureMode, channels: readonly string[]): void {
        mode.channels = [...channels];
        if (mode.heads !== undefined && !mode.heads.every((head) => head.every((key) => channels.includes(key)))) {
            delete mode.heads;
        }
        this.structure.emit();
    }

    /**
     * Stops the notifications.
     */
    dispose(): void {
        this.structure.clear();
    }
}
