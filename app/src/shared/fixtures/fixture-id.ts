/**
 * Identifier of a fixture definition: "<manufacturer>/<model>" in slug
 * form, for example "clay-paky/sharpy". It is also the path of the
 * definition file inside a fixture library ("clay-paky/sharpy.json").
 */

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Turns a name into a slug: lowercase ASCII letters and digits separated by "-".
 * Accented letters lose their accent; "+" becomes "plus".
 */
export function toSlug(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\+/g, ' plus ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Identifier of the definition of a model.
 */
export function fixtureId(manufacturer: string, model: string): string {
    return `${toSlug(manufacturer)}/${toSlug(model)}`;
}

/**
 * Tells whether a text is a valid definition identifier.
 */
export function isFixtureId(value: string): boolean {
    const parts = value.split('/');
    return parts.length === 2 && parts.every((part) => SLUG_PATTERN.test(part));
}
