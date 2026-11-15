// What `@fragiola/grid-layout-react` and `@fragiola/grid-layout` resolve to when `../grid-layout`
// is not beside this repository (siblings.ts): enough for the Grid Layout scenario's module to
// load (the build, the scenario convention's test), never shown (the catalog leaves it out).

/** No grid: the scenario is not in the catalog. */
export const GridLayout = {};

/** No grid to hold. */
export function useGridLayoutRef(): undefined {
    return undefined;
}
