/**
 * Adds or changes an LED matrix: name, number, size, pixel type, wiring
 * (start corner, rows or columns, zigzag) and start universe and address.
 * The summary shows the pixels, the channels and the universes it takes;
 * the matrix continues by itself on the next universes.
 */

import { ChoiceKeys, Dialog, Key, Label, NumberField, SelectField, Stack, TextField } from '../../../framework/ts/index.js';
import { UNIVERSE_SIZE } from '../../../shared/fixtures/fixture-definition.js';
import { findFreeAddress, findFreeNumber } from '../../../shared/patch/address-map.js';
import {
    channelsPerPixel,
    isValidMatrixShape,
    MATRIX_SIZE_LIMITS,
    matrixSegments,
    PIXEL_DIRECTIONS,
    PIXEL_TYPES,
    START_CORNERS,
    type PixelDirection,
    type PixelType,
    type StartCorner
} from '../../../shared/patch/matrix.js';
import { MAX_FIXTURE_NUMBER, MAX_UNIVERSE } from '../../../shared/patch/patch.js';
import type { MatrixEntry, MatrixRequest } from '../../../shared/transport/engine-api.js';
import { askChoice } from '../../dialogs/ask-choice.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';
import type { PatchRow } from './patch-rows.js';

async function removeMatrix(matrix: MatrixEntry): Promise<boolean> {
    const choice = await askChoice(t('matrix.removeTitle'), t('matrix.removeConfirm', { name: matrix.name }), [
        { id: 'cancel', label: t('common.cancel') },
        { id: 'remove', label: t('patch.remove'), destructive: true, primary: true }
    ]);
    if (choice !== 'remove') {
        return false;
    }
    try {
        await engine().request('patch.remove', { ids: [matrix.id] });
        return true;
    } catch (error) {
        await showError(error);
        return false;
    }
}

/**
 * Opens the dialog of a matrix.
 * @param matrix - Matrix to change, or null to add one
 * @param rows - Rows of the patch, to propose a free number and address
 * @param universe - Universe proposed for a new matrix
 */
export function openMatrixDialog(matrix: MatrixEntry | null, rows: readonly PatchRow[], universe = 1): void {
    const dialog = new Dialog({ title: matrix === null ? t('matrix.addTitle') : t('matrix.editTitle'), size: 'wide' });
    const others = rows.filter((row) => row.matrix?.id !== matrix?.id || matrix === null);
    const startUniverse = matrix?.universe ?? universe;

    const name = new TextField({ label: t('patch.name'), value: matrix?.name ?? t('matrix.defaultName'), maxLength: 100 });
    const number = new NumberField({ label: t('patch.columnNumber'), value: matrix?.number ?? findFreeNumber(others), min: 1, max: MAX_FIXTURE_NUMBER });
    const width = new NumberField({ label: t('matrix.width'), value: matrix?.width ?? 16, min: MATRIX_SIZE_LIMITS.min, max: MATRIX_SIZE_LIMITS.max });
    const height = new NumberField({ label: t('matrix.height'), value: matrix?.height ?? 16, min: MATRIX_SIZE_LIMITS.min, max: MATRIX_SIZE_LIMITS.max });
    const pixelType = new SelectField<PixelType>({
        label: t('matrix.pixelType'),
        options: PIXEL_TYPES.map((type) => ({ value: type, label: type.toUpperCase() })),
        value: matrix?.pixelType ?? 'rgb'
    });
    const startCorner = new SelectField<StartCorner>({
        label: t('matrix.startCorner'),
        options: START_CORNERS.map((corner) => ({ value: corner, label: t(`matrix.corner.${corner}`) })),
        value: matrix?.startCorner ?? 'topLeft'
    });
    const direction = new SelectField<PixelDirection>({
        label: t('matrix.direction'),
        options: PIXEL_DIRECTIONS.map((item) => ({ value: item, label: t(`matrix.directions.${item}`) })),
        value: matrix?.direction ?? 'rows'
    });
    const snake = new ChoiceKeys<'yes' | 'no'>({
        label: t('matrix.snake'),
        options: [{ value: 'no', label: t('matrix.snakeNo') }, { value: 'yes', label: t('matrix.snakeYes') }],
        value: matrix?.snake === false ? 'no' : 'yes'
    });
    const universeField = new NumberField({ label: t('patch.universeField'), value: startUniverse, min: 1, max: MAX_UNIVERSE });
    const address = new NumberField({
        label: t('patch.address'),
        value: matrix?.address ?? findFreeAddress(others, startUniverse, channelsPerPixel('rgb')) ?? 1,
        min: 1,
        max: UNIVERSE_SIZE
    });
    const summary = new Label({ text: '', tone: 'secondary', size: 'small' });

    const data = (): MatrixRequest => ({
        number: number.value,
        name: name.value,
        width: width.value,
        height: height.value,
        pixelType: pixelType.value,
        startCorner: startCorner.value,
        direction: direction.value,
        snake: snake.value === 'yes',
        universe: universeField.value,
        address: address.value
    });
    const update = (): void => {
        const shape = data();
        if (!isValidMatrixShape(shape)) {
            summary.setText(t('matrix.invalid'));
            return;
        }
        const segments = matrixSegments(shape);
        const last = segments[segments.length - 1];
        summary.setText(t('matrix.summary', {
            pixels: shape.width * shape.height,
            channels: segments.reduce((total, segment) => total + segment.channelCount, 0),
            first: shape.universe,
            last: last.universe
        }));
    };
    [number, width, height, universeField, address].forEach((field) => field.onChange(update));
    [pixelType, startCorner, direction].forEach((field) => field.onChange(update));
    snake.onChange(update);
    update();

    dialog.append(
        new Stack({ direction: 'row', gap: 2, wrap: true, children: [name, number] }),
        new Stack({ direction: 'row', gap: 2, wrap: true, children: [width, height, pixelType] }),
        new Stack({ direction: 'row', gap: 2, wrap: true, align: 'end', children: [startCorner, direction, snake] }),
        new Stack({ direction: 'row', gap: 2, wrap: true, children: [universeField, address] }),
        summary,
        new Label({ text: t('matrix.hint'), tone: 'secondary', size: 'small' })
    );

    const apply = async (): Promise<void> => {
        try {
            if (matrix === null) {
                await engine().request('patch.addMatrix', data());
            } else {
                await engine().request('patch.updateMatrix', { ...data(), id: matrix.id });
            }
            dialog.close();
        } catch (error) {
            await showError(error);
        }
    };
    const cancel = new Key({ label: t('common.cancel') });
    const applyKey = new Key({ label: matrix === null ? t('matrix.add') : t('common.apply'), state: 'active' });
    cancel.onPress(() => dialog.close());
    applyKey.onPress(() => void apply());
    if (matrix !== null) {
        const remove = new Key({ label: t('patch.remove'), icon: 'trash-2', armed: true });
        remove.onPress(() => void removeMatrix(matrix).then((removed) => {
            if (removed) {
                dialog.close();
            }
        }));
        dialog.addActions(remove);
    }
    dialog.addActions(cancel, applyKey);
    dialog.onCancel(() => dialog.close());
    dialog.open();
    name.focus();
}
