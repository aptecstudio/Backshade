/**
 * Live view of the stage: reads the frames the engine sends on the universes
 * and shows what every placed fixture does with them, moving at the speed of
 * a real one, with beams and light on the surfaces.
 */

import * as THREE from 'three';
import { Emitter, type Unsubscribe } from '../../framework/ts/index.js';
import type { FixtureDefinition } from '../../shared/fixtures/fixture-definition.js';
import { laserLight, ledLight, type EffectBeam, type LaserLight, type LedLight } from '../../shared/stage/effect-light.js';
import { fixtureLight, type FixtureLight } from '../../shared/stage/fixture-light.js';
import { lightProfile, type LightProfile } from '../../shared/stage/light-profile.js';
import { prismLayout } from '../../shared/stage/prism-layout.js';
import type { StageObject } from '../../shared/stage/stage.js';
import type { PatchEntry } from '../../shared/transport/engine-api.js';
import { engine } from '../transport/engine.js';
import type { ModelInfo } from './model-library.js';
import { StageBeams } from './stage-beams.js';
import { StageFrameMeter } from './stage-frame-meter.js';
import { StageGobos } from './stage-gobos.js';
import { SHADOW_LIGHTS, StageLights, type Spot } from './stage-lights.js';
import { HAZE_STRENGTH, QUALITY, type LiveSettings, type QualityLevel } from './stage-live-settings.js';
import { StageRig } from './stage-rig.js';
import { StageOcclusion } from './stage-occlusion.js';
import { StageProjection, type Projector } from './stage-projection.js';
import type { StageScene } from './stage-scene.js';
import type { StageView } from './stage-view.js';

/** Fastest pan and tilt of a real head, degrees per second */
const PAN_SPEED = 240;
const TILT_SPEED = 180;

/** Longest drawn beam, in meters */
const REACH = 14;

/** What a part of the model does: a colored light, a laser or a strobe LED */
type Part = { kind: 'light' | 'derby'; light: FixtureLight } | { kind: 'laser'; laser: LaserLight } | { kind: 'led'; led: LedLight };

/** Rays of a derby, one for each lens of its curved front (six columns of two), and of the laser grating */
const DERBY_COLUMNS = [-32.5, -19.5, -6.5, 6.5, 19.5, 32.5].map(THREE.MathUtils.degToRad);
const DERBY_ROWS = [-7, 7].map(THREE.MathUtils.degToRad);
const DERBY_ANGLE = 6;
const LASER_RAYS = 9;
/** Fastest rotation of an effect, radians per second */
const SPIN_SPEED = Math.PI;

const ULTRAVIOLET = new THREE.Color(0x5a10ff);
const WHITE = new THREE.Color(0xffffff);
const RED = new THREE.Color(0xff0000);
const GREEN = new THREE.Color(0x00ff20);

/** Brightness left by a flashing output */
const lit = (beam: EffectBeam, time: number, seed: number, strobe: boolean): number => beam.level * (strobe ? flash(beam, time, seed) : 1);

/** Direction at an angle from an axis, around it by a turn */
function around(axis: THREE.Vector3, off: number, turn: number): THREE.Vector3 {
    const side = new THREE.Vector3(0, 1, 0).cross(axis);
    if (side.lengthSq() < 0.001) {
        side.set(1, 0, 0);
    }
    return axis.clone().applyAxisAngle(side.normalize(), off).applyAxisAngle(axis, turn);
}

/** Beams towards the floor end on it */
const toFloor = (position: THREE.Vector3, direction: THREE.Vector3): number =>
    direction.y < -0.05 && position.y > 0 ? Math.min(REACH, position.y / -direction.y) : REACH;

interface Source {
    object: StageObject;
    fixture: PatchEntry;
    definition: FixtureDefinition;
    profile: LightProfile;
    /** What each part of the model does, from left to right */
    lights: Part[];
    /** Turn of the derbies and of the laser, in radians */
    turn: number[];
    /** Turn of the gobo and of the prism of every part */
    goboTurn: number[];
    prismTurn: number[];
    /** Where the head is now, on its way to where it was told */
    pan: number | null;
    tilt: number;
}

/** Brightness left by the shutter at a moment, in seconds */
function flash(light: Pick<FixtureLight, 'shutter' | 'rate'>, time: number, seed: number): number {
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
    private readonly occlusion: StageOcclusion;
    private readonly meter = new StageFrameMeter();
    private readonly gobos = new StageGobos();
    private readonly projection: StageProjection;
    private readonly rates = new Emitter<{ rate: number; level: QualityLevel }>();

    constructor(private readonly view: StageView, private readonly scene: StageScene, private readonly models: ReadonlyMap<string, ModelInfo>, settings: LiveSettings) {
        this.settings = settings;
        this.occlusion = new StageOcclusion(scene);
        this.projection = new StageProjection(view.scene);
        this.beams.root.visible = false;
        view.scene.add(this.beams.root, this.lights.root);
    }

    /** Frames drawn in the last second and quality in use */
    onRate(listener: (state: { rate: number; level: QualityLevel }) => void): Unsubscribe {
        return this.rates.subscribe(listener);
    }

    private get level(): QualityLevel {
        return this.settings.quality === 'auto' ? this.meter.quality : this.settings.quality;
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
                lights: before?.lights ?? [], turn: before?.turn ?? [], goboTurn: before?.goboTurn ?? [], prismTurn: before?.prismTurn ?? [], pan: before?.pan ?? null, tilt: before?.tilt ?? 0
            };
        }));
        this.sources = sources.filter((source) => source !== null);
        this.occlusion.clear();
        if (this.running) {
            // New objects also take part in the shadows
            this.apply();
        }
        this.beams.keep(new Set(this.sources.map((source) => source.object.id)));
    }

    /** Kinds of the parts of the model of an object, from left to right */
    private kinds(object: StageObject): Part['kind'][] {
        return this.models.get(object.model)?.emitters?.map((emitter) => emitter.kind ?? 'light') ?? ['light'];
    }

    /** What every part of a fixture does with its channels */
    private parts(source: Source, mode: string, values: ArrayLike<number>): Part[] {
        const kinds = this.kinds(source.object);
        const colored = kinds.filter((kind) => kind === 'light' || kind === 'derby').length;
        let cell = 0;
        let led = 0;
        return kinds.map((kind): Part => {
            if (kind === 'laser') {
                return { kind, laser: laserLight(source.definition, mode, values) };
            }
            if (kind === 'led') {
                return { kind, led: ledLight(source.definition, mode, values, led++) };
            }
            const index = cell++;
            return { kind, light: fixtureLight(source.definition, source.profile, mode, values, colored === 1 ? undefined : { index, count: colored }) };
        });
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
        this.occlusion.clear();
        this.meter.reset();
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
        this.view.setShadows(false);
        this.projection.detach();
        this.gobos.clear();
        for (const source of this.sources) {
            const rig = this.rig(source);
            rig?.aim(0, 0);
            this.kinds(source.object).forEach((_, index) => rig?.glow(index, new THREE.Color(), 0));
            source.lights = [];
            source.pan = null;
        }
        this.view.setPixelRatio(2);
        this.view.setHouseLights(true);
    }

    private apply(): void {
        const quality = QUALITY[this.level];
        // Shadows need the lights that cast them, also at the lowest quality
        this.lights.resize(this.settings.shadows ? Math.max(quality.spots, SHADOW_LIGHTS) : quality.spots, this.settings.shadows);
        this.view.setShadows(this.settings.shadows);
        // Gobos and prisms are projected at every quality, with smaller pictures at the lowest
        this.projection.setDetail(this.level === 'low');
        this.projection.attach();
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
        const level = this.level;
        const rate = this.meter.frame(now, Number(this.settings.frameRate));
        if (rate !== null) {
            if (this.level !== level) {
                this.apply();
            }
            this.rates.emit({ rate, level: this.level });
        }
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
                    const values = frame.slice(address - 1, address - 1 + channelCount);
                    source.lights = this.parts(source, mode, values);
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
        /** Gobos and prisms, with their strength apart from the strobe, which keeps their choice steady */
        const patterns: Array<{ projector: Projector; angle: number; lumens: number; strength: number }> = [];
        const haze = HAZE_STRENGTH[this.settings.haze];
        this.occlusion.refill();
        this.beams.frame();
        this.sources.forEach((source, index) => {
            const rig = this.rig(source);
            if (source.lights.length === 0 || rig === null) {
                return;
            }
            const main = source.lights.flatMap((part) => part.kind === 'light' || part.kind === 'derby' ? [part.light] : [])[0];
            if (main !== undefined) {
                const towards = (from: number, to: number, speed: number): number => from + Math.max(-speed * step, Math.min(speed * step, to - from));
                // The first values are taken at once; then the head travels to them
                source.tilt = source.pan === null ? main.tilt : towards(source.tilt, main.tilt, TILT_SPEED * main.speed);
                source.pan = source.pan === null ? main.pan : towards(source.pan, main.pan, PAN_SPEED * main.speed);
                rig.aim(source.pan, source.tilt);
            }
            source.lights.forEach((part, cell) => {
                const place = rig.lights[cell];
                if (place === undefined) {
                    return;
                }
                place.emitter.updateWorldMatrix(true, false);
                const position = new THREE.Vector3().setFromMatrixPosition(place.emitter.matrixWorld);
                const direction = new THREE.Vector3(0, 1, 0).transformDirection(place.emitter.matrixWorld);
                const id = `${source.object.id}:${cell}`;
                const seed = index + cell;
                if (part.kind === 'led') {
                    const white = lit(part.led.white, time, seed, this.settings.strobe);
                    const violet = lit(part.led.uv, time, seed, this.settings.strobe);
                    const color = (white > 0 ? WHITE : ULTRAVIOLET).clone();
                    const level = Math.max(white, violet * 0.7, part.led.program ? Math.max(0, Math.sin(time * 9 + seed)) : 0);
                    rig.glow(cell, color, level);
                    this.beams.set(id, { position, direction, color, strength: level * haze * 0.6, angle: 50, lensRadius: place.radius, length: Math.min(3, toFloor(position, direction)) });
                    return;
                }
                if (part.kind === 'laser') {
                    const { laser } = part;
                    source.turn[cell] = (source.turn[cell] ?? 0) + (laser.program ? 0.4 : laser.spin) * SPIN_SPEED * step;
                    const colors = [
                        { color: RED, level: laser.program ? 1 : lit(laser.red, time, seed, this.settings.strobe) },
                        { color: GREEN, level: laser.program ? 1 : lit(laser.green, time, seed, this.settings.strobe) }
                    ];
                    rig.glow(cell, colors[0].level > 0 ? RED : GREEN, Math.max(colors[0].level, colors[1].level));
                    // Thin rays of the grating, red and green by turns
                    for (let ray = 0; ray < LASER_RAYS * 2; ray++) {
                        const { color, level } = colors[ray % 2];
                        const aim = around(direction, THREE.MathUtils.degToRad(6 + (ray % 5) * 6), source.turn[cell] + ray * 2.4);
                        this.beams.set(`${id}:${ray}`, { position, direction: aim, color, strength: level * Math.max(0.08, haze) * 3, angle: 0.4, lensRadius: 0.006, length: toFloor(position, aim) });
                    }
                    return;
                }
                const { light } = part;
                // An automatic programme of the fixture: colors that change by themselves
                const level = light.level * (this.settings.strobe ? flash(light, time, index) : 1);
                const color = light.program
                    ? new THREE.Color().setHSL((time * 0.15 + cell * 0.23 + index * 0.1) % 1, 1, 0.5)
                    : new THREE.Color().setRGB(...light.color, THREE.SRGBColorSpace);
                rig.glow(cell, color, level);
                const narrow = Math.min(2, Math.sqrt(20 / Math.max(3, light.angle)));
                if (part.kind === 'derby') {
                    source.turn[cell] = (source.turn[cell] ?? 0) + (light.program ? 0.3 : light.spin) * SPIN_SPEED * step;
                    // Right and up of the derby, from the point on its lens
                    const right = new THREE.Vector3(1, 0, 0).transformDirection(place.emitter.matrixWorld);
                    const up = new THREE.Vector3(0, 0, -1).transformDirection(place.emitter.matrixWorld);
                    DERBY_COLUMNS.forEach((across, column) => {
                        DERBY_ROWS.forEach((lift, row) => {
                            const lens = direction.clone().multiplyScalar(Math.cos(across)).addScaledVector(right, Math.sin(across));
                            const aim = lens.clone().multiplyScalar(Math.cos(lift)).addScaledVector(up, Math.sin(lift)).applyAxisAngle(direction, source.turn[cell]);
                            // The ray leaves its lens; the motor turns the whole pattern
                            const from = position.clone().addScaledVector(lens, place.radius);
                            this.beams.set(`${id}:${column}-${row}`, { position: from, direction: aim, color, strength: level * haze, angle: DERBY_ANGLE, lensRadius: 0.012, length: toFloor(from, aim) });
                        });
                    });
                    spots.push({ position, direction, color, level, angle: 55, lumens: source.profile.lumens / source.lights.length });
                    return;
                }
                source.goboTurn[cell] = (source.goboTurn[cell] ?? 0) + light.goboSpin * SPIN_SPEED * step;
                source.prismTurn[cell] = (source.prismTurn[cell] ?? 0) + light.prismSpin * SPIN_SPEED * 0.5 * step;
                // An indexed wheel stays at its angle; a shaking one swings around where it is
                const swing = (rate: number): number => rate === 0 ? 0 : Math.sin(time * rate * Math.PI * 2);
                const goboTurn = light.goboIndex ?? source.goboTurn[cell];
                const prismTurn = (light.prismIndex ?? source.prismTurn[cell]) + swing(light.prismShake) * 0.22;
                const shift = swing(light.goboShake) * 0.17;
                // The gobo, repeated by the prism, is one pattern projected by one light
                const layout = prismLayout(light.prism);
                const single = THREE.MathUtils.degToRad(Math.min(light.angle, 120) / 2);
                const cone = Math.min(THREE.MathUtils.degToRad(50), Math.atan(Math.tan(single) / layout.size));
                const pattern = light.gobo === null && light.prism === 1 && light.goboShake === 0 ? null
                    : this.gobos.texture(id, { mask: light.gobo, turn: goboTurn, soft: light.soft, layout, prismTurn, shift });
                const streaks = light.gobo === null ? null : this.gobos.texture(`${id}:mask`, { mask: light.gobo, turn: goboTurn, soft: light.soft, layout: prismLayout(1), prismTurn: 0, shift });
                const right = new THREE.Vector3(1, 0, 0).transformDirection(place.emitter.matrixWorld);
                const up = new THREE.Vector3(0, 0, -1).transformDirection(place.emitter.matrixWorld);
                const strength = level * haze * narrow * (1 - 0.4 * light.soft) / Math.sqrt(light.prism);
                // In the haze every copy of the prism is a beam; at low quality one in three, brighter
                const step3 = this.level === 'low' && layout.copies.length > 6 ? 3 : 1;
                layout.copies.forEach(([x, y], copy) => {
                    if (copy % step3 !== 0) {
                        return;
                    }
                    const turned = new THREE.Vector2(x, y).rotateAround(new THREE.Vector2(), prismTurn).multiplyScalar(Math.tan(cone));
                    const aim = light.prism === 1 ? direction : direction.clone().addScaledVector(right, turned.x).addScaledVector(up, turned.y).normalize();
                    const beam = light.prism === 1 ? id : `${id}:p${copy}`;
                    const length = this.occlusion.reach(beam, this.scene.node(source.object.id), position, aim, toFloor(position, aim));
                    this.beams.set(beam, { position, direction: aim, color, strength: strength * step3, angle: light.angle, lensRadius: place.radius / Math.sqrt(light.prism), length, soft: light.soft, gobo: streaks });
                });
                if (pattern === null) {
                    spots.push({ position, direction, color, level, angle: light.angle, lumens: source.profile.lumens / source.lights.length, soft: light.soft > 0 ? light.soft : undefined });
                } else {
                    const lumens = source.profile.lumens / source.lights.length;
                    patterns.push({ projector: { position, direction, color, level, cone: THREE.MathUtils.radToDeg(cone) * 2, picture: pattern }, angle: light.angle, lumens, strength: light.level * lumens });
                }
            });
        });
        // With shadows on, the strongest patterns go to lights that objects stop; the others are projected through them
        patterns.sort((a, b) => b.strength - a.strength);
        const stopped = this.settings.shadows ? patterns.splice(0, SHADOW_LIGHTS) : [];
        for (const { projector: { position, direction, color, level, cone, picture }, angle, lumens } of stopped) {
            spots.push({ position, direction, color, level, angle, lumens, cone, gobo: picture });
        }
        this.lights.set(spots);
        this.projection.set(patterns.map((pattern) => pattern.projector));
    }
}
