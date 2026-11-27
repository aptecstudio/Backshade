/**
 * Editor of the stage of the open show: the toolbar, what can be added on
 * the left, the 3D view and the selected object on the right. It follows the
 * patch and the access of the operator.
 */

import { ChoiceKeys, Key, Label, Spacer, Stack } from '../../framework/ts/index.js';
import type { StageObject } from '../../shared/stage/stage.js';
import type { PatchEntry } from '../../shared/transport/engine-api.js';
import { showError } from '../dialogs/show-error.js';
import { t } from '../i18n/i18n.js';
import { engine } from '../transport/engine.js';
import type { ModelInfo } from './model-library.js';
import { StageDocument } from './stage-document.js';
import * as edits from './stage-edits.js';
import { StageHandles, type HandleMode } from './stage-handles.js';
import { StageInspector, type InspectorAction } from './stage-inspector.js';
import { StageLibraryPanel } from './stage-library-panel.js';
import { StageScene } from './stage-scene.js';
import { STAGE_CAMERAS, StageView, type StageCamera } from './stage-view.js';

export class StageEditor extends Stack {
    private readonly models: ReadonlyMap<string, ModelInfo>;
    private readonly document = new StageDocument();
    private readonly view = new StageView();
    private readonly scene: StageScene;
    private readonly handles: StageHandles;
    private readonly library: StageLibraryPanel;
    private readonly inspector: StageInspector;
    private readonly undoKey = new Key({ label: t('stage.undo') });
    private readonly redoKey = new Key({ label: t('stage.redo') });
    private readonly modeKeys: ChoiceKeys<HandleMode>;
    private readonly readOnly = new Label({ text: t('stage.readOnly'), tone: 'secondary' });
    private fixtures: PatchEntry[] = [];
    private editable = false;
    private camera: StageCamera = 'free';

    constructor(models: readonly ModelInfo[]) {
        super({ gap: 2, classes: ['stage-editor'] });
        this.models = new Map(models.map((model) => [model.id, model]));
        this.scene = new StageScene(this.models, () => this.handles.refresh());
        this.view.scene.add(this.scene.root);
        this.handles = new StageHandles(this.view, this.scene);
        this.library = new StageLibraryPanel(models);
        this.inspector = new StageInspector(models);

        const cameras = new ChoiceKeys<StageCamera>({
            ariaLabel: t('stage.camera'),
            options: STAGE_CAMERAS.map((value) => ({ value, label: t(`stage.cameras.${value}`) })),
            value: this.camera
        });
        cameras.onChange((camera) => {
            this.camera = camera;
            this.view.setCamera(camera, this.scene.root);
        });
        this.modeKeys = new ChoiceKeys<HandleMode>({
            ariaLabel: t('stage.handles'),
            options: [{ value: 'translate', label: t('stage.move') }, { value: 'rotate', label: t('stage.rotate') }],
            value: 'translate'
        });
        this.modeKeys.onChange((mode) => this.handles.setMode(mode));

        this.append(
            new Stack({ direction: 'row', gap: 2, align: 'center', wrap: true, children: [cameras, new Spacer(), this.readOnly, this.modeKeys, this.undoKey, this.redoKey] }),
            new Stack({ direction: 'row', gap: 2, classes: ['stage-editor__body'], children: [this.library, this.view, this.inspector] })
        );
        this.bind();
    }

    /** Reads the stage and the patch of the open show; a new show frames its content */
    async load(newShow: boolean): Promise<void> {
        this.fixtures = await engine().request('patch.get');
        await this.document.load(newShow);
        if (newShow) {
            this.handles.select(null);
            await this.scene.sync(this.document.objects);
            this.view.setCamera(this.camera, this.scene.root);
        }
    }

    setEditable(editable: boolean): void {
        this.editable = editable;
        this.handles.setEditable(editable);
        this.render();
    }

    private bind(): void {
        this.track(this.document.onChange(() => {
            void this.scene.sync(this.document.objects).catch(showError);
            if (this.handles.selection !== null && !this.document.objects.some((object) => object.id === this.handles.selection)) {
                this.handles.select(null);
            }
            this.render();
        }));
        this.handles.onSelect(() => this.render());
        // While dragging, what hangs from a truss follows it
        this.handles.onMove((change) => {
            for (const object of edits.transform(this.document.objects, change.id, change.position, change.rotation)) {
                if (object.hungOn === change.id) {
                    this.scene.place(object);
                }
            }
        });
        this.handles.onRelease((change) => this.document.apply(edits.transform(this.document.objects, change.id, change.position, change.rotation)));
        this.library.onAdd((model) => this.add(model, null));
        this.library.onPlace((fixture) => {
            const moving = fixture.category === 'movingHead' || fixture.category === 'scanner';
            this.add(moving ? 'moving-head' : 'par', fixture.id);
        });
        this.inspector.onAction((action) => this.act(action));
        this.inspector.onModel((model) => this.change((objects, id) => objects.map((object) => object.id === id ? { ...object, model } : object)));
        this.undoKey.onPress(() => this.document.undo());
        this.redoKey.onPress(() => this.document.redo());
        this.listen(document, 'keydown', (event) => this.shortcut(event));
    }

    private add(model: string, fixture: string | null): void {
        if (!this.editable) {
            return;
        }
        const width = this.models.get(model)?.length ?? (model === 'deck-2x1' ? 2 : 0.6);
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
            const copy = { ...edits.newObject(source.model, [x, y, edits.snap(z + 0.6)]), rotation: source.rotation };
            this.document.apply([...this.document.objects, copy]);
            this.handles.select(copy.id);
        } else if (action === 'remove') {
            this.change(edits.remove);
        } else if (action === 'hang') {
            this.change((objects, id) => edits.hang(objects, id, this.models));
        } else if (action === 'detach') {
            this.change(edits.detach);
        }
    }

    private shortcut(event: KeyboardEvent): void {
        const key = event.key.toLowerCase();
        const command = event.ctrlKey || event.metaKey;
        if (command && key === 's') {
            event.preventDefault();
            void engine().request('show.save').catch(showError);
        } else if (event.target instanceof HTMLSelectElement || !this.editable) {
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
        this.library.element.hidden = !this.editable;
        this.library.setFixtures(this.fixtures.filter((fixture) => !placed.has(fixture.id)));
        this.inspector.show({
            object: selected,
            fixture: this.fixtures.find((fixture) => fixture.id === selected?.fixture) ?? null,
            editable: this.editable,
            hasTruss: objects.some((object) => this.models.get(object.model)?.length !== undefined)
        });
        this.readOnly.element.hidden = this.editable;
        this.modeKeys.element.hidden = !this.editable;
        this.undoKey.element.hidden = !this.editable;
        this.redoKey.element.hidden = !this.editable;
        this.undoKey.setDisabled(!this.document.canUndo);
        this.redoKey.setDisabled(!this.document.canRedo);
    }
}
