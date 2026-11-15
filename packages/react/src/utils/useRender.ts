// From Grid Layout (fragiola/grid-layout, packages/react/src/utils/useRender.ts), same author and licence.
//
// The public shapes of a wrapper's props: `render` (Base UI style), and `className`/`style` as a
// value or a function of the state. The rendering itself is `useWrap`'s: a dnd wrapper clones
// its child instead of rendering an element of its own (D6).
import type * as React from "react";

/**
 * Props a `render` function receives: spread them onto the element it returns. `ref` is a callback
 * ref, so it fits any element's `ref` (`render={(props) => <section {...props} />}` needs no cast).
 */
export type RenderedProps<E extends Element = HTMLElement> =
    React.HTMLAttributes<E> & {
        ref: React.RefCallback<E>;
        [dataAttribute: `data-${string}`]: string | undefined;
    };

/**
 * What a wrapper renders when it has no child to wrap, Base UI style: an element whose props are
 * merged with the wrapper's (`render={<li />}`), or a function receiving the props and the
 * wrapper's state (`render={(props, state) => <li {...props} />}`).
 */
export type RenderProp<State, E extends Element = HTMLElement> =
    | React.ReactElement
    | ((props: RenderedProps<E>, state: State) => React.ReactElement);

/** The props every wrapper accepts besides its own options. */
export interface WrapperProps<State> {
    /** the one element the wrapper adds its behaviour to (or the content of `render`) */
    children?: React.ReactNode;
    /** the element to render when there is no child to wrap */
    render?: RenderProp<State> | undefined;
    /** a class name added to the element's own, or a function of the state returning one */
    className?: string | ((state: State) => string | undefined) | undefined;
    /**
     * a style merged over the element's own, or a function of the state returning one; the
     * wrapper's structural keys always win
     */
    style?:
        | React.CSSProperties
        | ((state: State) => React.CSSProperties | undefined)
        | undefined;
    /** merged with the wrapper's own ref and the child's */
    ref?: React.Ref<HTMLElement> | undefined;
}
