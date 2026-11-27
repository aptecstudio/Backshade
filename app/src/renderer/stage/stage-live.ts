/**
 * Live view of the stage: reads the frames the engine sends on the universes
 * and shows what every placed fixture does with them, moving at the speed of
 * a real one, with beams and light on the surfaces.
 */

import * as THREE from 'three';
import type { FixtureDefinition } from '../../shared/fixtures/fixture-definition.js';
import { fixtureLight, type FixtureLight } from '../../shared/stage/fixture-light.js';
import { lightProfile, type LightProfile } from '../../shared/stage/light-profile.js';
import type { StageObject } from '../../shared/stage/stage.js';
import type { PatchEntry } from '../../shared/transport/engine-api.js';
import { engine } from '../transport/engine.js';
import type { ModelInfo } from './model-library.js';
import { StageBeams } from './stage-beams.js';
import { StageLights, type Spot } from './stage-lights.js';
import { HAZE_STRENGTH, QUALITY, type LiveSettings } from './stage-live-settings.js';
import { StageRig } from './stage-rig.js';
import type { StageScene } from './stage-scene.js';
import type { StageView } from './stage-view.js';

/** Fastest pan and tilt of a real head, degrees per second */
const PAN_SPEED = 240;
const TILT_SPEED = 180;

/** Longest drawn beam, in meters */
const REACH = 14;

interface Source {
    object: StageObject;
    fixture: PatchEntry;
    definition: FixtureDefinition;
    profile: LightProfile;
    light: FixtureLight | null;
    /** Where the head is now, on its way to where it was told */
    pan: number | null;
    tilt: number;
}

/** Brightness left by the shutter at a moment, in seconds */
function flash(light: FixtureLight, time: number, seed: number): number {
    const phase = time * light.rate;
    if (light.shutter === 'strobe') {
        return phase % 1 < 0.4 ? 1 : 0;
    }
    if (light.shutter === 'pulse') {
        return 1 - phase % 1;
    }
    if (light.shutter === 'random') {
        return Math.abs(Math.sin((Math.floor(phase) + seed) * 12.9898)) > 0.5 ? 1 : 0;
    }
    return 1;
}

export class StageLive {
    private readonly beams = new StageBeams();
    private readonly lights = new StageLights();
    private readonly definitions = new Map<string, Promise<FixtureDefinition | null>>();
    private readonly rigs = new WeakMap<THREE.Object3D, StageRig>();
    private sources: Source[] = [];
    private settings: LiveSettings;
    private running = false;
    private frame = 0;
    private last = 0;
    private reading = false;

    constructor(private readonly view: StageView, private readonly scene: StageScene, private readonly models: ReadonlyMap<string, ModelInfo>, settings: LiveSettings) {
        this.settings = settings;
        this.beams.root.visible = false;
        view.scene.add(this.beams.root, this.lights.root);
    }

    configure(settings: LiveSettings): void {
        this.settings = settings;
        if (this.running) {
            this.apply();
        }
    }

    /** The placed fixtures, after the stage or the patch changed */
    async update(objects: readonly StageObject[], fixtures: readonly PatchEntry[]): Promise<void> {
        const patch = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
        const previous = new Map(this.sources.map((source) => [source.object.id, source]));
        const sources = await Promise.all(objects.map(async (object): Promise<Source | null> => {
            const fixture = object.fixture === null ? undefined : patch.get(object.fixture);
            if (fixture === undefined || fixture.missing) {
                return null;
            }
            const definition = await this.definition(fixture.definition);
            const before = previous.get(object.id);
            return definition === null ? null : {
                object, fixture, definition, profile: lightProfile(definition),
                light: before?.light ?? null, pan: before?.pan ?? null, tilt: before?.tilt ?? 0
            };
        }));
        this.sources = sources.filter((source) => source !== null);
        this.beams.keep(new Set(this.sources.map((source) => source.object.id)));
    }

    /** The library changed: definitions are read again */
    forgetDefinitions(): void {
        this.definitions.clear();
    }

    start(): void {
        if (this.running) {
            return;
        }
        this.running = true;
        this.view.setHouseLights(false);
        this.apply();
        this.last = performance.now();
        this.frame = requestAnimationFrame(this.tick);
    }

    /** Back to the setup view: fixtures off and at rest */
    stop(): void {
        if (!this.running) {
            return;
        }
        this.running = false;
        cancelAnimationFrame(this.frame);
        this.beams.root.visible = false;
        this.lights.resize(0);
        for (const source of this.sources) {
            const rig = this.rig(source);
            rig?.aim(0, 0);
            rig?.glow(new THREE.Color(), 0);
            source.light = null;
            source.pan = null;
        }
        this.view.setPixelRatio(2);
        this.view.setHouseLights(true);
    }

    private apply(): void {
        const quality = QUALITY[this.settings.quality];
        this.lights.resize(quality.spots);
        this.view.setPixelRatio(quality.pixelRatio);
        this.beams.root.visible = this.settings.beams;
    }

    private definition(id: string): Promise<FixtureDefinition | null> {
        let found = this.definitions.get(id);
        if (found === undefined) {
            found = engine().request('fixtures.get', { id }).then((record) => record.definition, () => null);
            this.definitions.set(id, found);
        }
        return found;
    }

    private rig(source: Source): StageRig | null {
        const model = this.scene.node(source.object.id)?.children[0];
        const info = this.models.get(source.object.model);
        if (model === undefined || info === undefined) {
            return null;
        }
        let rig = this.rigs.get(model);
        if (rig === undefined) {
            rig = new StageRig(model, info);
            this.rigs.set(model, rig);
        }
        return rig;
    }

    private readonly tick = (now: number): void => {
        this.frame = requestAnimationFrame(this.tick);
        const elapsed = now - this.last;
        // A small margin, so the limit does not skip every other frame of the screen
        if (elapsed < 1000 / Number(this.settings.frameRate) - 4) {
            return;
        }
        this.last = now;
        void this.readFrames();
        this.show(now / 1000, Math.min(0.2, elapsed / 1000));
        this.view.draw();
    };

    private async readFrames(): Promise<void> {
        if (this.reading) {
            return;
        }
        this.reading = true;
        try {
            const universes = [...new Set(this.sources.map((source) => source.fixture.universe))];
            const frames = new Map(await Promise.all(universes.map(async (universe) => [universe, await engine().request('output.getFrame', { universe })] as const)));
            for (const source of this.sources) {
                const { universe, address, channelCount, mode } = source.fixture;
                const frame = frames.get(universe);
                if (frame !== undefined) {
                    source.light = fixtureLight(source.definition, source.profile, mode, frame.slice(address - 1, address - 1 + channelCount));
                }
            }
        } catch {
            // The show may be closing: the next frame tries again
        } finally {
            this.reading = false;
        }
    }

    private show(time: number, step: number): void {
        const spots: Spot[] = [];
        const haze = HAZE_STRENGTH[this.settings.haze];
        this.sources.forEach((source, index) => {
            const { light } = source;
            const rig = this.rig(source);
            if (light === null || rig === null) {
                return;
            }
            const towards = (from: number, to: number, speed: number): number => from + Math.max(-speed * step, Math.min(speed * step, to - from));
            // The first values are taken at once; then the head travels to them
            source.tilt = source.pan === null ? light.tilt : towards(source.tilt, light.tilt, TILT_SPEED * light.speed);
            source.pan = source.pan === null ? light.pan : towards(source.pan, light.pan, PAN_SPEED * light.speed);
            rig.aim(source.pan, source.tilt);

            const level = light.level * (this.settings.strobe ? flash(light, time, index) : 1);
            const color = new THREE.Color().setRGB(...light.color, THREE.SRGBColorSpace);
            rig.glow(color, level);

            rig.emitter.updateWorldMatrix(true, false);
            const position = new THREE.Vector3().setFromMatrixPosition(rig.emitter.matrixWorld);
            const direction = new THREE.Vector3(0, 1, 0).transformDirection(rig.emitter.matrixWorld);
            // Beams towards the floor end on it
            const length = direction.y < -0.05 && position.y > 0 ? Math.min(REACH, position.y / -direction.y) : REACH;
            const narrow = Math.min(2, Math.sqrt(20 / Math.max(3, light.angle)));
            this.beams.set(source.object.id, { position, direction, color, strength: level * haze * narrow, angle: light.angle, lensRadius: rig.radius, length });
            spots.push({ position, direction, color, level, angle: light.angle, lumens: source.profile.lumens });
        });
        this.lights.set(spots);
    }
}
