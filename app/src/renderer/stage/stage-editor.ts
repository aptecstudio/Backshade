/**
 * Editor of the stage of the open show: the toolbar, what can be added on
 * the left, the 3D view and the selected object on the right. It follows the
 * patch and the access of the operator.
 */

import { ChoiceKeys, Key, Label, Spacer, Stack } from '../../framework/ts/index.js';
import type { CustomModel } from '../../shared/stage/custom-model.js';
import type { StageObject } from '../../shared/stage/stage.js';
import type { PatchEntry } from '../../shared/transport/engine-api.js';
import { showError } from '../dialogs/show-error.js';
import { t } from '../i18n/i18n.js';
import { engine } from '../transport/engine.js';
import { editCustomModel, importCustomModel } from './custom-model-actions.js';
import { useCustomModels } from './custom-models.js';
import { defaultModel } from './default-model.js';
import type { ModelInfo } from './model-library.js';
import { StageDocument } from './stage-document.js';
import * as edits from './stage-edits.js';
import { StageHandles, type HandleMode } from './stage-handles.js';
import { StageInspector, type InspectorAction } from './stage-inspector.js';
import { StageLibraryPanel } from './stage-library-panel.js';
import { StageLiveBar } from './stage-live-bar.js';
import { readLiveSettings } from './stage-live-settings.js';
import { StageLive } from './stage-live.js';
import { StageScene } from './stage-scene.js';
import { STAGE_CAMERAS, StageView, VIEW_TOOLS, type StageCamera, type ViewTool } from './stage-view.js';

/** Setting up the stage, or watching it follow the output */
type StageMode = 'setup' | 'live';

export class StageEditor extends Stack {
    /** Bundled models and those imported into the show */
    private readonly models: Map<string, ModelInfo>;
    private readonly document = new StageDocument();
    private readonly view = new StageView();
    private readonly scene: StageScene;
    private readonly handles: StageHandles;
    private readonly library: StageLibraryPanel;
    private readonly inspector: StageInspector;
    private readonly undoKey = new Key({ label: t('stage.undo') });
    private readonly redoKey = new Key({ label: t('stage.redo') });
    private readonly modeKeys: ChoiceKeys<HandleMode>;
    private readonly tools: ChoiceKeys<ViewTool>;
    private readonly readOnly = new Label({ text: t('stage.readOnly'), tone: 'secondary' });
    private fixtures: PatchEntry[] = [];
    private readonly live: StageLive;
    private readonly liveBar: StageLiveBar;
    private mode: StageMode = 'setup';
    private editable = false;
    /** Personal library of imported models */
    private libraryModels: CustomModel[] = [];
    private camera: StageCamera = 'free';

    constructor(models: readonly ModelInfo[]) {
        super({ gap: 12, classes: ['stage-editor'] });
        this.models = new Map(models.map((model) => [model.id, model]));
        this.scene = new StageScene(this.models, () => this.handles.refresh());
        this.view.scene.add(this.scene.root);
        this.handles = new StageHandles(this.view, this.scene);
        this.library = new StageLibraryPanel(models);
        this.inspector = new StageInspector(models);
        const settings = readLiveSettings();
        this.live = new StageLive(this.view, this.scene, this.models, settings);
        this.liveBar = new StageLiveBar(settings);
        this.liveBar.onChange((next) => this.live.configure(next));
        this.live.onRate(({ rate, level }) => this.liveBar.showRate(rate, level));
        const modes = new ChoiceKeys<StageMode>({
            ariaLabel: t('stage.mode'),
            options: [{ value: 'setup', label: t('stage.setup') }, { value: 'live', label: t('stage.live') }],
            value: this.mode
        });
        modes.onChange((mode) => this.setStageMode(mode));
        this.track(() => this.live.stop());
        this.track(engine().on('fixtures.changed', () => this.live.forgetDefinitions()));

        const cameras = new ChoiceKeys<StageCamera>({
            ariaLabel: t('stage.camera'),
            options: STAGE_CAMERAS.map((value) => ({ value, label: t(`stage.cameras.${value}`) })),
            value: this.camera
        });
        cameras.onChange((camera) => {
            this.camera = camera;
            this.view.setCamera(camera, this.scene.root);
        });
        this.tools = new ChoiceKeys<ViewTool>({
            ariaLabel: t('stage.tool'),
            options: VIEW_TOOLS.map((value) => ({ value, label: t(`stage.tools.${value}`) })),
            value: 'select'
        });
        this.tools.onChange((tool) => this.applyTool(tool));
        this.modeKeys = new ChoiceKeys<HandleMode>({
            ariaLabel: t('stage.handles'),
            options: [{ value: 'translate', label: t('stage.move') }, { value: 'rotate', label: t('stage.rotate') }],
            value: 'translate'
        });
        this.modeKeys.onChange((mode) => this.handles.setMode(mode));

        this.append(
            new Stack({ direction: 'row', gap: 8, align: 'center', wrap: true, children: [modes, cameras, this.tools, new Spacer(), this.readOnly, this.liveBar, this.modeKeys, this.undoKey, this.redoKey] }),
            new Stack({ direction: 'row', gap: 8, classes: ['stage-editor__body'], children: [this.library, this.view, this.inspector] })
        );
        this.bind();
    }

    /** Reads the stage and the patch of the open show; a new show frames its content */
    async load(newShow: boolean): Promise<void> {
        this.fixtures = await engine().request('patch.get');
        await this.document.load(newShow);
        this.libraryModels = await engine().request('stage.listLibraryModels');
        this.showImported();
        await this.live.update(this.document.objects, this.fixtures);
        if (newShow) {
            this.handles.select(null);
            await this.scene.sync(this.document.objects);
            this.view.setCamera(this.camera, this.scene.root);
        }
    }

    setEditable(editable: boolean): void {
        this.editable = editable;
        this.handles.setEditable(editable && this.mode === 'setup');
        this.render();
    }

    /** Stops the live view, when the editor is not shown */
    suspend(): void {
        this.live.stop();
    }

    /** Takes the live view up again, if it was chosen */
    resume(): void {
        if (this.mode === 'live') {
            this.live.start();
        }
    }

    private setStageMode(mode: StageMode): void {
        this.mode = mode;
        this.handles.select(null);
        this.handles.setEditable(this.editable && mode === 'setup');
        if (mode === 'live') {
            this.live.start();
        } else {
            this.live.stop();
        }
        this.render();
    }

    private bind(): void {
        this.track(this.document.onChange(() => {
            this.showImported();
            void this.scene.sync(this.document.objects)
                .then(() => this.live.update(this.document.objects, this.fixtures))
                .catch(showError);
            if (this.handles.selection !== null && !this.document.objects.some((object) => object.id === this.handles.selection)) {
                this.handles.select(null);
            }
            this.render();
        }));
        this.handles.onSelect((id) => {
            if (id !== null && this.mode === 'live') {
                this.handles.select(null);
                return;
            }
            this.render();
        });
        // While dragging, what hangs from a truss follows it
        this.handles.onMove((change) => {
            for (const object of edits.transform(this.document.objects, change.id, change.position, change.rotation)) {
                if (object.hungOn === change.id) {
                    this.scene.place(object);
                }
            }
        });
        this.handles.onRelease((change) => this.document.apply(edits.transform(this.document.objects, change.id, change.position, change.rotation)));
        this.handles.setHeights((id) => {
            const object = this.document.objects.find((item) => item.id === id);
            return object === undefined ? null : edits.liftOf(object, this.models);
        });
        // While the arrow is dragged, the stand and what is on it follow
        this.handles.onLift((change) => {
            for (const object of edits.setHeight(this.document.objects, change.id, change.height, this.models)) {
                if (object.id === change.id || object.hungOn === change.id) {
                    this.scene.place(object);
                }
            }
            this.handles.refresh();
        });
        this.handles.onLifted((change) => this.document.apply(edits.setHeight(this.document.objects, change.id, change.height, this.models)));
        this.library.onAdd((model) => void this.addModel(model).catch(showError));
        this.library.onImport(() => void importCustomModel());
        this.library.onEdit((id) => {
            const there = this.document.models.find((item) => item.id === id);
            const model = there ?? this.libraryModels.find((item) => item.id === id);
            if (model !== undefined) {
                void editCustomModel(model, there === undefined ? 'library' : 'show');
            }
        });
        this.library.onPlace((fixture) => void defaultModel(fixture).then((model) => this.add(model, fixture.id)));
        this.inspector.onAction((action) => this.act(action));
        this.inspector.onModel((model) => this.change((objects, id) => objects.map((object) => object.id === id ? { ...object, model } : object)));
        this.undoKey.onPress(() => this.document.undo());
        this.redoKey.onPress(() => this.document.redo());
        this.listen(document, 'keydown', (event) => this.shortcut(event));
    }

    private showImported(): void {
        useCustomModels(this.models, this.document.models);
        this.library.setImported(this.document.models, this.libraryModels);
    }

    /** Places a model; one of the personal library is first copied into the show */
    private async addModel(id: string): Promise<void> {
        if (this.editable && !this.document.models.some((item) => item.id === id) && this.libraryModels.some((item) => item.id === id)) {
            await engine().request('stage.useLibraryModel', { id });
            await this.document.load(false);
        }
        this.add(id, null);
    }

    private add(model: string, fixture: string | null): void {
        if (!this.editable || (fixture !== null && this.document.objects.some((object) => object.fixture === fixture))) {
            return;
        }
        const width = this.models.get(model)?.width ?? 0.6;
        const object = edits.newObject(model, edits.freeSpot(this.document.objects, this.view.centre, width), fixture);
        this.document.apply([...this.document.objects, object]);
        this.handles.select(object.id);
    }

    private change(operation: (objects: readonly StageObject[], id: string) => StageObject[]): void {
        const id = this.handles.selection;
        if (this.editable && id !== null) {
            this.document.apply(operation(this.document.objects, id));
        }
    }

    private act(action: InspectorAction): void {
        const source = this.document.objects.find((object) => object.id === this.handles.selection);
        if (action === 'duplicate' && source !== undefined && source.fixture === null) {
            const [x, y, z] = source.position;
            const copy = { ...edits.newObject(source.model, [x, y, edits.snap(z + 0.6)]), rotation: source.rotation, height: source.height };
            this.document.apply([...this.document.objects, copy]);
            this.handles.select(copy.id);
        } else if (action === 'remove') {
            this.change(edits.remove);
        } else if (action === 'hang') {
            this.change((objects, id) => edits.hang(objects, id, this.models));
        } else if (action === 'mount') {
            this.change((objects, id) => edits.mount(objects, id, this.models));
        } else if (action === 'detach') {
            this.change(edits.detach);
        }
    }

    private applyTool(tool: ViewTool): void {
        this.tools.setValue(tool);
        this.view.setTool(tool);
        this.handles.setSelecting(tool === 'select');
    }

    /** Keys of the view, also with a read only or live stage: O, H, Z, Space and Shift+Z */
    private viewShortcut(event: KeyboardEvent, key: string): boolean {
        const tool = ({ o: 'orbit', h: 'pan', z: 'zoom', ' ': 'select' } as const)[key as 'o' | 'h' | 'z' | ' '];
        if (event.ctrlKey || event.metaKey || event.altKey || event.target instanceof HTMLSelectElement || event.target instanceof HTMLInputElement) {
            return false;
        }
        if (key === 'z' && event.shiftKey) {
            this.view.frameContent(this.scene.root);
        } else if (tool !== undefined) {
            this.applyTool(tool);
        } else if (key === 'escape' && this.view.surface.dataset.tool !== 'select') {
            this.applyTool('select');
        } else {
            return false;
        }
        event.preventDefault();
        return true;
    }

    private shortcut(event: KeyboardEvent): void {
        const key = event.key.toLowerCase();
        const command = event.ctrlKey || event.metaKey;
        if (this.viewShortcut(event, key)) {
            return;
        }
        if (command && key === 's') {
            event.preventDefault();
            void engine().request('show.save').catch(showError);
        } else if (event.target instanceof HTMLSelectElement || !this.editable || this.mode === 'live') {
            return;
        } else if (command && (key === 'y' || (key === 'z' && event.shiftKey))) {
            this.document.redo();
        } else if (command && key === 'z') {
            this.document.undo();
        } else if (key === 'delete' || key === 'backspace') {
            this.act('remove');
        } else if (key === 'escape') {
            this.handles.select(null);
        }
    }

    private render(): void {
        const objects = this.document.objects;
        const placed = new Set(objects.map((object) => object.fixture));
        const selected = objects.find((object) => object.id === this.handles.selection) ?? null;
        const editing = this.editable && this.mode === 'setup';
        this.library.element.hidden = !editing;
        this.inspector.element.hidden = this.mode === 'live';
        this.liveBar.element.hidden = this.mode !== 'live';
        this.library.setFixtures(this.fixtures.filter((fixture) => !placed.has(fixture.id)));
        this.inspector.show({
            object: selected,
            fixture: this.fixtures.find((fixture) => fixture.id === selected?.fixture) ?? null,
            editable: this.editable,
            hasTruss: objects.some((object) => edits.canHang(this.models.get(object.model))),
            hasStand: objects.some((object) => edits.topOf(object, this.models) !== null),
            height: selected === null ? null : edits.liftOf(selected, this.models),
            mounted: objects.some((object) => object.id === selected?.hungOn && selected !== null && edits.topOf(object, this.models) !== null
                && Math.abs(selected.position[0] - object.position[0]) < 0.01 && Math.abs(selected.position[2] - object.position[2]) < 0.01)
        });
        this.readOnly.element.hidden = this.editable || this.mode === 'live';
        this.modeKeys.element.hidden = !editing;
        this.undoKey.element.hidden = !editing;
        this.redoKey.element.hidden = !editing;
        this.undoKey.setDisabled(!this.document.canUndo);
        this.redoKey.setDisabled(!this.document.canRedo);
    }
}
