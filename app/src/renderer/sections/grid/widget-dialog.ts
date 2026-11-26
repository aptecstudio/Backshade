/**
 * Adds or changes a widget of the grid: type (when added), label, link
 * (what it controls, among the kinds its type accepts) and size in cells;
 * an existing widget can be deleted.
 */

import { Dialog, Key, Label, NumberField, SelectField, Stack, TextField, type SelectOption } from '../../../framework/ts/index.js';
import {
    AUDIO_ACTIONS,
    CUE_ACTIONS,
    DESK_ACTIONS,
    GRID_MASTERS,
    WIDGET_LINKS,
    WIDGET_SIZES,
    WIDGET_TYPES,
    type AudioAction,
    type CueAction,
    type DeskAction,
    type GridMaster,
    type GridPage,
    type GridWidget,
    type LinkKind,
    type WidgetLink,
    type WidgetType
} from '../../../shared/grid/grid.js';
import { MAX_UNIVERSE } from '../../../shared/patch/patch.js';
import { t } from '../../i18n/i18n.js';
import type { GridStore } from './grid-store.js';

/** Result of the dialog: the widget to save, or delete */
export type WidgetDialogResult = { action: 'save'; widget: GridWidget } | { action: 'delete' };

/**
 * Opens the dialog.
 * @param widget - Widget to change, or a new widget at its cell
 * @param isNew - The widget is being added: its type can be chosen
 */
export function openWidgetDialog(widget: GridWidget, isNew: boolean, page: GridPage, store: GridStore): Promise<WidgetDialogResult | null> {
    return new Promise((resolve) => {
        const dialog = new Dialog({ title: isNew ? t('grid.addWidget') : t('grid.editWidget') });
        let type: WidgetType = widget.type;
        const typeField = new SelectField<WidgetType>({
            label: t('grid.widgetType'),
            options: WIDGET_TYPES.map((item) => ({ value: item, label: t(`grid.types.${item}`) })),
            value: type
        });
        typeField.setDisabled(!isNew);
        const label = new TextField({ label: t('grid.label'), value: widget.label, maxLength: 60 });
        const linkKind = new SelectField<LinkKind>({ label: t('grid.link'), options: [], value: widget.link.kind });
        const target = new SelectField<string>({ label: t('grid.target'), options: [], value: '' });
        const universe = new NumberField({ label: t('patch.universeField'), value: widget.link.kind === 'channel' ? widget.link.universe : 1, min: 1, max: MAX_UNIVERSE });
        const channel = new NumberField({ label: t('grid.channel'), value: widget.link.kind === 'channel' ? widget.link.channel : 1, min: 1, max: 512 });
        const width = new NumberField({ label: t('grid.width'), value: widget.w, min: 1, max: page.columns - widget.x });
        const height = new NumberField({ label: t('grid.height'), value: widget.h, min: 1, max: page.rows - widget.y });
        const hint = new Label({ text: '', tone: 'secondary', size: 'small' });
        const channelRow = new Stack({ direction: 'row', gap: 2, children: [universe, channel] });

        const targetOptions = (kind: LinkKind): Array<SelectOption<string>> => {
            switch (kind) {
                case 'scene': return store.memories.scenes.map((scene) => ({ value: scene.id, label: `S${scene.slot} ${scene.name}` }));
                case 'chaser': return store.memories.chasers.map((chaser) => ({ value: chaser.id, label: `C${chaser.slot} ${chaser.name}` }));
                case 'group': return store.groups.map((group) => ({ value: group.id, label: `${group.number} ${group.name}` }));
                case 'cue': return CUE_ACTIONS.map((action) => ({ value: action, label: t(`grid.cueActions.${action}`) }));
                case 'master': return GRID_MASTERS.map((master) => ({ value: master, label: t(`grid.masters.${master}`) }));
                case 'desk': return DESK_ACTIONS.map((action) => ({ value: action, label: t(`grid.deskActions.${action}`) }));
                case 'audio': return AUDIO_ACTIONS.map((action) => ({ value: action, label: t(`grid.audioActions.${action}`) }));
                default: return [];
            }
        };
        const currentTarget = (): string => {
            const link = widget.link;
            switch (link.kind) {
                case 'scene': case 'chaser': case 'group': return link.id;
                case 'cue': case 'desk': case 'audio': return link.action;
                case 'master': return link.master;
                default: return '';
            }
        };
        const renderTarget = (): void => {
            const kind = linkKind.value;
            const options = targetOptions(kind);
            const keep = options.some((option) => option.value === currentTarget()) ? currentTarget() : options[0]?.value ?? '';
            target.setOptions(options, keep);
            target.element.hidden = options.length === 0 && kind !== 'scene' && kind !== 'chaser' && kind !== 'group';
            channelRow.element.hidden = kind !== 'channel';
            const empty = (kind === 'scene' || kind === 'chaser' || kind === 'group') && options.length === 0;
            hint.setText(empty ? t(`grid.noTargets.${kind}`) : '');
        };
        // The select starts empty: the kind of the widget is kept here until the options exist
        let chosenKind: LinkKind = widget.link.kind;
        const renderKinds = (): void => {
            const kinds = WIDGET_LINKS[type];
            chosenKind = kinds.includes(chosenKind) ? chosenKind : kinds[0];
            linkKind.setOptions(kinds.map((kind) => ({ value: kind, label: t(`grid.links.${kind}`) })), chosenKind);
            renderTarget();
        };
        typeField.onChange((value) => {
            type = value;
            width.setValue(Math.min(WIDGET_SIZES[value].w, page.columns - widget.x));
            height.setValue(Math.min(WIDGET_SIZES[value].h, page.rows - widget.y));
            renderKinds();
        });
        linkKind.onChange((kind) => {
            chosenKind = kind;
            renderTarget();
        });
        renderKinds();

        dialog.append(
            new Stack({ direction: 'row', gap: 2, wrap: true, children: [typeField, label] }),
            new Stack({ direction: 'row', gap: 2, wrap: true, children: [linkKind, target] }),
            channelRow,
            hint,
            new Stack({ direction: 'row', gap: 2, children: [width, height] })
        );

        const link = (): WidgetLink => {
            const kind = linkKind.value;
            const value = target.value;
            switch (kind) {
                case 'scene': case 'chaser': case 'group': return value === '' ? { kind: 'none' } : { kind, id: value };
                case 'cue': return { kind: 'cue', action: value as CueAction };
                case 'master': return { kind: 'master', master: value as GridMaster };
                case 'desk': return { kind: 'desk', action: value as DeskAction };
                case 'audio': return { kind: 'audio', action: value as AudioAction };
                case 'channel': return { kind: 'channel', universe: universe.value, channel: channel.value };
                default: return { kind: 'none' };
            }
        };
        const finish = (result: WidgetDialogResult | null): void => {
            dialog.close();
            resolve(result);
        };
        const cancel = new Key({ label: t('common.cancel') });
        const apply = new Key({ label: isNew ? t('grid.add') : t('common.apply'), state: 'active' });
        cancel.onPress(() => finish(null));
        apply.onPress(() => finish({ action: 'save', widget: { ...widget, type, label: label.value.trim(), link: link(), w: width.value, h: height.value } }));
        if (!isNew) {
            const remove = new Key({ label: t('common.delete'), icon: 'trash-2', armed: true });
            remove.onPress(() => finish({ action: 'delete' }));
            dialog.addActions(remove);
        }
        dialog.addActions(cancel, apply);
        dialog.onCancel(() => finish(null));
        dialog.open();
    });
}
