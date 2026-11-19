// The attributes of a host element, from every dnd directive on it (D7). Directives stack on one
// element (`<li dndDraggable="a" dndDroppable="z">`), so no directive owns an attribute alone:
// each gives its own set, and the element shows them merged, in one order (the drag sources
// first, as React's inner wrapper): `data-dnd-part` lists every part (`"draggable droppable"`,
// matched with `~=`), and any other attribute takes the first part's value that has one (so
// `data-dnd-id` is the drag source's, and a flag is present when any part sets it). They are
// written directly, never through a host binding: a part's state change (from the core) writes
// its attributes at once, with no change detection (D8).

/** A part a directive puts on its element, in the order the element lists them. */
export const PARTS = [
    "draggable",
    "sortable",
    "swappable",
    "handle",
    "droppable",
    "sortable-group",
] as const;

/** A part's name (`data-dnd-part`). */
export type PartName = (typeof PARTS)[number];

/** A part's attributes: a value is present, `undefined` absent. */
export type PartAttributes = Readonly<Record<string, string | undefined>>;

/** The parts on each element, and the attribute names written for them. */
const hosts = new WeakMap<
    Element,
    {
        readonly parts: Map<PartName, PartAttributes>;
        written: Set<string>;
    }
>();

/**
 * Sets the attributes `part` gives `element` (none: the part is gone) and writes the element's
 * merged attributes, touching only those that change.
 */
export function writePart(
    element: HTMLElement,
    part: PartName,
    attributes: PartAttributes | undefined,
): void {
    let host = hosts.get(element);
    if (!host) {
        if (!attributes) return;
        host = { parts: new Map(), written: new Set() };
        hosts.set(element, host);
    }
    if (attributes) host.parts.set(part, attributes);
    else host.parts.delete(part);

    const merged = new Map<string, string>();
    const parts = PARTS.filter((name) => host.parts.has(name));
    if (parts.length > 0) merged.set("data-dnd-part", parts.join(" "));
    for (const name of parts)
        for (const [key, value] of Object.entries(host.parts.get(name) ?? {}))
            if (value !== undefined && !merged.has(key)) merged.set(key, value);

    for (const key of host.written)
        if (!merged.has(key)) element.removeAttribute(key);
    for (const [key, value] of merged)
        if (element.getAttribute(key) !== value)
            element.setAttribute(key, value);
    host.written = new Set(merged.keys());
    if (host.parts.size === 0) hosts.delete(element);
}

/** A flag attribute's value: present (empty) or absent. */
export const flag = (on: boolean): string | undefined => (on ? "" : undefined);
