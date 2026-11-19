// The wrapper (D6), in Vue: a dnd part renders no element of its own. It renders its single
// default-slot child cloned with its props merged in: its `data-dnd-*` and ARIA, the attributes
// an outer wrapper or the consumer passed on (`class`, `style`, listeners, …), the structural
// style (always winning) and its template ref (beside the child's own). `as` renders an element
// of the given tag or component instead, when there is no child to wrap; the default slot is then
// its content. This is the documented exception to the Fragiola "render, never asChild" rule:
// the wrapper exists to add behaviour to elements other code renders. The Vue form of
// `packages/react/src/utils/useWrap.ts`.
import {
    Comment,
    type Component,
    type ComputedRef,
    camelize,
    cloneVNode,
    type DefineSetupFnComponent,
    defineComponent,
    Fragment,
    h,
    mergeProps,
    nextTick,
    normalizeStyle,
    onMounted,
    type Prop,
    type SlotsType,
    Text,
    type VNode,
    type VNodeChild,
} from "vue";
import { type ElementRef, toElement } from "./element-ref";

// Development checks are written `process.env.NODE_ENV !== "production"`, literally, as Vue's
// own are: an app's bundler (Vite, in dev too, webpack, Nuxt, …) replaces it, and a production
// build drops the checks and their messages.
declare const process: { readonly env: { readonly NODE_ENV?: string } };

type AnyProps = Record<string, unknown>;

/** A tag or a component a wrapper renders when it has no child to wrap: the `as` prop. */
export type AsProp = string | Component;

/** The props every wrapper accepts besides its own options. */
export interface WrapperProps {
    /**
     * the tag or component to render when there is no child to wrap; the default slot is then its
     * content (`<Draggable id="a" as="li">A</Draggable>`)
     */
    as?: AsProp | undefined;
}

/** What a wrapper's default slot receives: the part's state (`v-slot="{ state }"`). */
export interface WrapperSlotProps<State> {
    readonly state: State;
}

/** The slots of a wrapper: its one child (or, with `as`, the content), scoped with its state. */
export interface WrapperSlots<State> {
    default?: (scope: WrapperSlotProps<State>) => VNode[];
}

/** A wrapper's public type: its props (plus any attribute it passes on) and its scoped slot. */
export type WrapperComponent<
    Props extends object,
    Slots extends object,
> = DefineSetupFnComponent<Props, Record<never, never>, SlotsType<Slots>>;

/** What a part gives {@link renderWrapper}. */
export interface WrapOptions<State> {
    /** its name, for the development messages */
    readonly part: string;
    readonly state: State;
    /** the composable's props: attributes, ARIA, structural `style` and the registering ref */
    readonly props: AnyProps;
    /** the attributes an outer wrapper or the consumer passed on to the element */
    readonly attrs: AnyProps;
    readonly as?: AsProp | undefined;
    /** the default slot's nodes: the child to wrap, or the content of `as` (or `fallback`) */
    readonly content: VNode[] | undefined;
    /** the tag rendered when there is neither a child nor `as` (the overlay's `div`) */
    readonly fallback?: string | undefined;
}

const join = (...names: unknown[]) =>
    names.filter((name) => typeof name === "string" && name).join(" ") ||
    undefined;

const isListener = (key: string) => /^on[A-Z]/.test(key);

/**
 * A `style` (an object, an array or a CSS string) as one object with camelCase keys (custom
 * properties kept), so the structural keys can win over it.
 */
function styleObject(style: unknown): AnyProps {
    const normalized = normalizeStyle(style);
    const result: AnyProps = {};
    const add = (name: string, value: unknown) => {
        result[name.startsWith("--") ? name : camelize(name)] = value;
    };
    if (typeof normalized === "string") {
        for (const declaration of normalized.split(/;(?![^(]*\))/g)) {
            const index = declaration.indexOf(":");
            if (index > 0)
                add(
                    declaration.slice(0, index).trim(),
                    declaration.slice(index + 1).trim(),
                );
        }
    } else if (normalized)
        for (const [name, value] of Object.entries(normalized))
            add(name, value);
    return result;
}

/** The slot's nodes that render something (a `v-if` left a comment). */
function rendered(content: VNode[] | undefined): VNode[] {
    return (content ?? []).filter((node) => node.type !== Comment);
}

/** Whether a node is one element or component, the only child a wrapper can wrap. */
function wrappable(node: VNode | undefined): node is VNode {
    return (
        node !== undefined &&
        node.type !== Text &&
        node.type !== Fragment &&
        node.type !== Comment
    );
}

/** Throws, in development, for anything but one element or component. */
function assertChild(part: string, nodes: VNode[]): void {
    const fix = `<${part}> wraps exactly one element (a DOM element, or a component whose root element takes its attributes and template ref), or takes \`as\`.`;
    if (nodes.length === 0) throw new Error(`${fix} It got no child.`);
    if (nodes.length > 1) throw new Error(`${fix} It got several children.`);
    const [node] = nodes;
    if (node?.type === Text)
        throw new Error(`${fix} It got text: wrap it in an element.`);
    if (node?.type === Fragment)
        throw new Error(
            `${fix} It got a fragment (a \`v-for\`, or a \`<template>\` of several nodes), which has no element to attach to.`,
        );
}

/**
 * Renders a wrapper: its child (or `as`) with the wrapper's props merged in. Returns the slot's
 * nodes untouched when they cannot be wrapped (in production; development throws).
 */
export function renderWrapper<State>(options: WrapOptions<State>): VNodeChild {
    const { part, attrs, content } = options;
    const { ref, style: structural, ...own } = options.props;
    const { style: given, ...rest } = attrs;
    // what an outer wrapper (or the consumer) passed on: over the wrapper's own, under the
    // element's; parts stack (`data-dnd-part="draggable droppable"`), the inner one's id wins
    const forwarded: AnyProps = {};
    for (const [key, value] of Object.entries(rest))
        if (value !== undefined) forwarded[key] = value;
    const attributes = mergeProps(own, forwarded);
    if (forwarded["data-dnd-part"]) {
        attributes["data-dnd-part"] = join(
            own["data-dnd-part"],
            forwarded["data-dnd-part"],
        );
        attributes["data-dnd-id"] = own["data-dnd-id"];
    }
    for (const [key, value] of Object.entries(attributes))
        if (value === undefined) delete attributes[key];
    // the structural keys win, an undefined one included (it removes the consumer's)
    const style: AnyProps = {
        ...styleObject(given),
        ...(structural as AnyProps | undefined),
    };
    for (const [key, value] of Object.entries(style))
        if (value === undefined) delete style[key];
    const extra: AnyProps = { ...attributes, ref };
    if (Object.keys(style).length > 0) extra.style = style;

    const tag = options.as ?? options.fallback;
    if (tag !== undefined) {
        if (typeof tag === "string") return h(tag, extra, content);
        return h(tag, extra, content ? { default: () => content } : undefined);
    }

    const nodes = rendered(content);
    if (process.env.NODE_ENV !== "production") assertChild(part, nodes);
    const [child] = nodes;
    if (nodes.length !== 1 || !wrappable(child)) return content;
    const childProps = (child.props ?? {}) as AnyProps;
    const clone = cloneVNode(child, extra, true);
    const merged = clone.props as AnyProps;
    for (const [key, value] of Object.entries(childProps)) {
        if (value === undefined || key === "class" || key === "style") continue;
        // handlers compose, the wrapper's first, then the element's own
        if (isListener(key)) {
            if (extra[key] !== undefined)
                merged[key] = [extra[key], value].flat();
        }
        // the element's own plain props win
        else if (key !== "ref") merged[key] = value;
    }
    return clone;
}

/** What a wrapper's composable returns. */
export interface WrappedPart<State> {
    readonly state: ComputedRef<State>;
    readonly props: ComputedRef<{ readonly ref: ElementRef }>;
}

/** How {@link defineWrapper} builds a part's component. */
export interface WrapperDefinition<Options extends object, State> {
    /** the component's name, also its name in the messages (`Draggable`) */
    readonly name: string;
    /** the props that are the part's options; every other attribute reaches the element */
    readonly options: readonly (keyof Options & string)[];
    /** the options that take a bare attribute as `true` (`<Draggable disabled>`) */
    readonly booleans?: readonly (keyof Options & string)[];
    /** the part's composable, given its options of the moment */
    readonly use: (options: () => Options) => WrappedPart<State>;
}

/**
 * Reports, in development and after the mount, an element that never received the wrapper's
 * template ref or its attributes (a component child that renders a fragment, or does not pass
 * its attributes on to its root element).
 */
export function checkElement(part: string, element: () => HTMLElement | null) {
    if (process.env.NODE_ENV === "production") return;
    onMounted(async () => {
        // after the flush: the element's template ref is set once the whole tree has mounted
        await nextTick();
        const found = element();
        if (!found)
            console.error(
                `<${part}>: its element never received the template ref, so it has no drag and drop behaviour. A component child must render one root element, as DOM elements and Fragiola primitives do.`,
            );
        else if (!found.hasAttribute("data-dnd-part"))
            console.error(
                `<${part}>: its element never received the wrapper's attributes (\`data-dnd-part\`, …). A component child must pass its attributes on to its root element (no \`inheritAttrs: false\` without \`v-bind="$attrs"\`).`,
            );
    });
}

/**
 * Defines a wrapper component: its options are props (callbacks included, so a listener such
 * as `@drop` reaches its `on…` option), every other attribute is passed on to the element, and it renders its
 * child cloned (or `as`), its default slot scoped with the part's state.
 */
export function defineWrapper<Options extends object, State>(
    definition: WrapperDefinition<Options, State>,
): WrapperComponent<Options & WrapperProps, WrapperSlots<State>> {
    const { name, options: names, booleans = [], use } = definition;
    const props: Record<string, Prop<unknown> | null> = { as: null };
    for (const key of names)
        props[key] = booleans.includes(key)
            ? { type: Boolean, default: undefined }
            : null;
    return defineComponent({
        name,
        inheritAttrs: false,
        props,
        setup(given, { attrs, slots }) {
            const read = given as AnyProps;
            // the options of the moment: those given, so a core default applies to the others
            const options = () => {
                const current: AnyProps = {};
                for (const key of names)
                    if (read[key] !== undefined) current[key] = read[key];
                return current as Options;
            };
            const part = use(options);
            let element: HTMLElement | null = null;
            const own = part.props.value.ref;
            const ref: ElementRef = (value) => {
                element = toElement(value);
                own(value);
            };
            checkElement(name, () => element);
            return () => {
                const state = part.state.value;
                return renderWrapper({
                    part: name,
                    state,
                    props: { ...(part.props.value as AnyProps), ref },
                    attrs,
                    as: read.as as AsProp | undefined,
                    content: slots.default?.({ state }),
                });
            };
        },
    }) as unknown as WrapperComponent<
        Options & WrapperProps,
        WrapperSlots<State>
    >;
}
