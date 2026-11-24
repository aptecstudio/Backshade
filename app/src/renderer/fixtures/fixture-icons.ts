/**
 * Icon of each fixture category, from the Lucide line icons.
 */

import type { IconName } from '../../framework/ts/index.js';
import type { FixtureCategory } from '../../shared/fixtures/fixture-definition.js';

const CATEGORY_ICONS: Readonly<Record<FixtureCategory, IconName>> = {
    dimmer: 'lightbulb',
    par: 'cone',
    ledBar: 'columns-4',
    pixelBar: 'grid-3x2',
    movingHead: 'spotlight',
    scanner: 'scan-line',
    strobe: 'zap',
    blinder: 'sun',
    effect: 'sparkles',
    laser: 'radar',
    smoke: 'cloud-fog',
    hazer: 'haze',
    other: 'circle-dot'
};

/** Icon shown when the definition of a fixture is missing */
export const MISSING_FIXTURE_ICON: IconName = 'circle-help';

/**
 * Icon of a category; the missing icon when the category is unknown.
 */
export function categoryIcon(category: FixtureCategory | null): IconName {
    return category === null ? MISSING_FIXTURE_ICON : CATEGORY_ICONS[category];
}
