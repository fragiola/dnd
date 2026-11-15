// The slice of `@fragiola/grid-layout-react` the dev-only Grid Layout scenario uses, declared
// here because the package is not on npm (D12): `pnpm typecheck` passes whether or not
// `../grid-layout` is beside this repository, and the scenario stays typechecked against this
// slice. At run time Vite aliases the name to Grid Layout's sources (siblings.ts). A change in
// Grid Layout's API is caught by the scenario's e2e spec, not here.
declare module "@fragiola/grid-layout-react" {
    import type * as React from "react";

    /** An item of the layout, in grid units. */
    export interface LayoutItem {
        readonly id: string;
        readonly x: number;
        readonly y: number;
        readonly w: number;
        readonly h: number;
    }
    /** The items of a grid. */
    export type Layout = readonly LayoutItem[];
    /** A grid's model, as the scenario drives it. */
    export interface GridLayoutModel {
        run(
            command: "item.add",
            payload: {
                readonly item: Omit<LayoutItem, "x" | "y"> & {
                    readonly x?: number;
                    readonly y?: number;
                };
            },
        ): { readonly ok: boolean };
    }
    /** A handle on a grid from outside its root. */
    export interface GridLayoutRef {
        readonly current: { readonly model: GridLayoutModel } | null;
        subscribe(listener: () => void): () => void;
    }
    /** A handle for `<GridLayout.Root gridLayoutRef>`. */
    export function useGridLayoutRef(): GridLayoutRef;

    interface Common {
        className?: string;
        style?: React.CSSProperties;
        ref?: React.Ref<HTMLElement>;
        children?: React.ReactNode;
        "aria-label"?: string;
        "data-testid"?: string;
    }
    /** The parts the scenario renders. */
    export const GridLayout: {
        Root(
            props: Common & {
                defaultLayout?: Layout;
                onLayoutChange?: (layout: Layout) => void;
                cols?: number;
                rowHeight?: number;
                gap?: readonly [number, number];
                gridLayoutRef?: GridLayoutRef;
            },
        ): React.ReactNode;
        Items(props: {
            children: (item: LayoutItem) => React.ReactNode;
        }): React.ReactNode;
        Item(props: Common & { itemId: string }): React.ReactNode;
    };
}
