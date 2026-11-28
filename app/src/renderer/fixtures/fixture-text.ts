/**
 * Texts of the fixture data: categories, attributes, capability kinds,
 * validation problems and summaries of definitions.
 */

import type { SelectGroup, SelectOption } from '../../framework/ts/index.js';
import {
    ATTRIBUTE_GROUPS,
    CAPABILITY_KINDS,
    FIXTURE_ATTRIBUTES,
    FIXTURE_CATEGORIES,
    type AttributeGroup,
    type CapabilityKind,
    type FixtureAttribute,
    type FixtureCategory
} from '../../shared/fixtures/fixture-definition.js';
import type { FixtureIssue } from '../../shared/fixtures/validate-fixture.js';
import type { FixtureSummary } from '../../shared/transport/engine-api.js';
import { t } from '../i18n/i18n.js';

/** Name of a category */
export function categoryLabel(category: FixtureCategory): string {
    return t(`fixtureCategories.${category}`);
}

/** Name of an attribute */
export function attributeLabel(attribute: FixtureAttribute): string {
    return t(`fixtureAttributes.${attribute}`);
}

/** Name of a capability kind */
export function capabilityKindLabel(kind: CapabilityKind): string {
    return t(`capabilityKinds.${kind}`);
}

/** Message of a validation problem */
export function issueMessage(issue: FixtureIssue): string {
    return t(`fixtureIssues.${issue.code}`, { subject: issue.subject ?? '' });
}

/** Categories, for a select field */
export function categoryOptions(): SelectOption<FixtureCategory>[] {
    return FIXTURE_CATEGORIES.map((category) => ({ value: category, label: categoryLabel(category) }));
}

/** Attributes grouped as the console shows them, for a select field */
export function attributeOptions(): SelectGroup<FixtureAttribute>[] {
    const groups = new Map<AttributeGroup, SelectOption<FixtureAttribute>[]>();
    for (const attribute of FIXTURE_ATTRIBUTES) {
        const group = ATTRIBUTE_GROUPS[attribute];
        groups.set(group, [...(groups.get(group) ?? []), { value: attribute, label: attributeLabel(attribute) }]);
    }
    return [...groups].map(([group, options]) => ({ label: t(`attributeGroups.${group}`), options }));
}

/** Capability kinds, with "other" for an empty value, for a select field */
export function capabilityKindOptions(): SelectOption<CapabilityKind | ''>[] {
    return [{ value: '', label: t('fixtureEditor.noKind') }, ...CAPABILITY_KINDS.map((kind) => ({ value: kind, label: capabilityKindLabel(kind) }))];
}

/** Manufacturer and model of a definition */
export function fixtureTitle(fixture: Pick<FixtureSummary, 'manufacturer' | 'model'>): string {
    return `${fixture.manufacturer} ${fixture.model}`;
}

/** Category and channels of a definition, for the lists */
export function fixtureDetails(fixture: FixtureSummary): string {
    const counts = fixture.modes.map((mode) => mode.channelCount);
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    const channels = min === max ? t('fixtures.channelCount', { count: min }) : t('fixtures.channelRange', { min, max });
    return `${categoryLabel(fixture.category)}, ${t('fixtures.modeCount', { count: fixture.modes.length })}, ${channels}`;
}

/** Source of a definition */
export function sourceLabel(fixture: FixtureSummary): string {
    if (fixture.source === 'bundled') {
        return t('fixtures.bundled');
    }
    if (fixture.source === 'show') {
        return t('fixtures.inShow');
    }
    return fixture.replacesBundled ? t('fixtures.replacesBundled') : t('fixtures.user');
}

/**
 * Tells whether a definition matches a search text: every word must
 * appear in the manufacturer or the model, ignoring case and accents.
 */
export function matchesSearch(fixture: FixtureSummary, search: string): boolean {
    const fold = (text: string): string => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const haystack = fold(`${fixture.manufacturer} ${fixture.model}`);
    return fold(search).split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
}
