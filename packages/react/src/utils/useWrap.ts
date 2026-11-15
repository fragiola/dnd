// The wrapper (D6): a dnd part renders no element of its own. It clones its single child (or the
// `render` element, or calls the `render` function) with its props merged in: handlers composed
// (the wrapper's first, then the element's own), its `data-dnd-*` and ARIA, the `className` and
// `style` (a value or a function of the state, the structural keys winning) and one ref that
// reaches the wrapper, the `ref` given to the wrapper and the element's own `ref` (a plain prop
// in React 19). This is the documented exception to the Fragiola "render, never asChild" rule:
// the wrapper exists to add behaviour to elements other code renders.
import * as React from "react";
import { mergeProps, mergeRefs } from "./mergeProps";
import type { RenderedProps, WrapperProps } from "./useRender";

// Development checks are written `process.env.NODE_ENV !== "production"`, literally, as React's
// are: an app's bundler (Vite, in dev too, webpack, Next, …) replaces it, and a production build
// drops the checks and their messages.
declare const process: { readonly env: { readonly NODE_ENV?: string } };

type AnyProps = Record<string, unknown>;

/** What a part gives `useWrap`: its name (for the messages), state and the props of its hook. */
export interface WrapOptions<State> {
    readonly part: string;
    readonly state: State;
    /** the hook's props: attributes, ARIA, handlers, structural `style` and the registering ref */
    readonly props: {
        readonly ref: React.RefCallback<HTMLElement>;
        readonly style?: React.CSSProperties | undefined;
    };
    /** the element rendered when there is neither a child nor `render` (the overlay's `div`) */
    readonly fallback?: React.ReactElement;
    /** the props an outer wrapper or the consumer passed on to the element */
    readonly forwarded?: AnyProps | undefined;
    /** whether to report, in development, an element that never received the ref */
    readonly checkRef?: boolean;
}

const join = (...names: unknown[]) =>
    names.filter((name) => typeof name === "string" && name).join(" ") ||
    undefined;

/** Throws, in development, for anything but one element that can take a ref. */
function assertChild(part: string, children: React.ReactNode): void {
    const fix = `<${part}> wraps exactly one element that forwards its ref and props (a DOM element, or a component that does), or takes a \`render\`.`;
    if (children === undefined || children === null || children === false)
        throw new Error(`${fix} It got no child.`);
    if (Array.isArray(children) || React.Children.count(children) > 1)
        throw new Error(`${fix} It got several children.`);
    if (typeof children === "string" || typeof children === "number")
        throw new Error(`${fix} It got text: wrap it in an element.`);
    if (!React.isValidElement(children))
        throw new Error(`${fix} It got ${String(children)}.`);
    if (children.type === React.Fragment)
        throw new Error(
            `${fix} It got a Fragment, which has no element to attach to.`,
        );
}

/**
 * Renders a wrapper: its child (or `render`) with the wrapper's props merged in. Returns the
 * child untouched when it cannot be wrapped (in production; development throws).
 */
export function useWrap<State>(
    wrapper: WrapperProps<State>,
    options: WrapOptions<State>,
): React.ReactNode {
    const { children, render, className, style, ref: wrapperRef } = wrapper;
    const { part, state, props: internal, fallback } = options;
    if (
        process.env.NODE_ENV !== "production" &&
        render === undefined &&
        !fallback
    )
        assertChild(part, children);
    // the element cloned: the `render` element, else the fallback (whose content the children
    // are), else the child itself
    let element: React.ReactElement | undefined;
    if (render !== undefined)
        element = typeof render === "function" ? undefined : render;
    else if (fallback) element = fallback;
    else if (React.isValidElement(children) && children.type !== React.Fragment)
        element = children;
    const elementProps = (element?.props ?? {}) as AnyProps;
    const elementRef = elementProps.ref as React.Ref<HTMLElement> | undefined;

    // the wrapper's own ref attaches once per element: an inline callback ref of the consumer must
    // not make React detach and re-attach it (and its registration) on every render. The
    // consumers' refs (the wrapper's `ref` and the element's own) are attached beside it, and
    // follow their changes after each render, as React does for a plain element's ref
    const consumerRefs = React.useRef<(React.Ref<HTMLElement> | undefined)[]>(
        [],
    );
    consumerRefs.current = [wrapperRef, elementRef];
    const attached = React.useRef(false);
    const bound = React.useRef<
        | {
              readonly node: HTMLElement;
              readonly refs: (React.Ref<HTMLElement> | undefined)[];
              readonly detach: () => void;
          }
        | undefined
    >(undefined);
    const bind = React.useCallback((node: HTMLElement) => {
        const refs = consumerRefs.current;
        bound.current = {
            node,
            refs,
            detach: mergeRefs(...refs)(node) as () => void,
        };
    }, []);
    const internalRef = internal.ref;
    const ref = React.useMemo<React.RefCallback<HTMLElement>>(
        () => (node: HTMLElement | null) => {
            if (!node) return;
            attached.current = true;
            const detachInternal = mergeRefs(internalRef)(node) as () => void;
            bind(node);
            return () => {
                bound.current?.detach();
                bound.current = undefined;
                detachInternal();
            };
        },
        [internalRef, bind],
    );
    React.useLayoutEffect(() => {
        const current = bound.current;
        const refs = consumerRefs.current;
        if (!current || refs.every((each, i) => each === current.refs[i]))
            return;
        current.detach();
        bind(current.node);
    });
    const checkRef = options.checkRef !== false;
    React.useEffect(() => {
        if (
            process.env.NODE_ENV !== "production" &&
            checkRef &&
            !attached.current
        )
            console.error(
                `<${part}>: its element never received the ref, so it has no drag and drop behaviour. A component child must pass \`ref\` and its other props on to its element, as DOM elements and Fragiola primitives do.`,
            );
    }, [checkRef, part]);

    if (render === undefined && !element) return children;

    const { ref: _ref, style: structural, ...own } = internal as AnyProps;
    // what an outer wrapper (or the consumer) passed on: over the wrapper's own, under the
    // element's; parts stack (`data-dnd-part="draggable droppable"`), the inner one's id wins
    const forwarded = options.forwarded;
    const attributes = forwarded ? mergeProps(own, forwarded) : own;
    if (forwarded?.["data-dnd-part"]) {
        attributes["data-dnd-part"] = join(
            own["data-dnd-part"],
            forwarded["data-dnd-part"],
        );
        attributes["data-dnd-id"] = own["data-dnd-id"];
    }
    const resolvedClassName =
        typeof className === "function" ? className(state) : className;
    const resolvedStyle = typeof style === "function" ? style(state) : style;
    const structuralStyle = structural as React.CSSProperties | undefined;

    if (typeof render === "function") {
        const props: AnyProps = { ...attributes, ref };
        if (children !== undefined) props.children = children;
        if (resolvedClassName !== undefined)
            props.className = resolvedClassName;
        if (resolvedStyle || structuralStyle)
            props.style = { ...resolvedStyle, ...structuralStyle };
        return render(props as unknown as RenderedProps, state);
    }
    const target = element as React.ReactElement<AnyProps>;
    const merged = mergeProps(attributes, elementProps);
    merged.ref = ref;
    merged.className = join(elementProps.className, resolvedClassName);
    const childStyle = elementProps.style as React.CSSProperties | undefined;
    merged.style =
        childStyle || resolvedStyle || structuralStyle
            ? { ...childStyle, ...resolvedStyle, ...structuralStyle }
            : undefined;
    // a `render` element (or the fallback) holds the wrapper's children; a wrapped child keeps its
    if (target !== children && children !== undefined)
        merged.children = children;
    return React.cloneElement(target, merged);
}

/**
 * Splits a wrapper's props: its own options (`keys`), and the rest, passed on to the element (so
 * a wrapper is itself a child that forwards props, and wrappers stack).
 */
export function splitProps<Props extends object, Key extends keyof Props>(
    props: Props,
    keys: readonly Key[],
): [Pick<Props, Key>, AnyProps | undefined] {
    const options = {} as Pick<Props, Key>;
    const rest: AnyProps = {};
    let forwarded = false;
    for (const [key, value] of Object.entries(props)) {
        if ((keys as readonly string[]).includes(key))
            (options as AnyProps)[key] = value;
        else {
            rest[key] = value;
            forwarded = true;
        }
    }
    return [options, forwarded ? rest : undefined];
}
