// The sortable group hook (S2): the lower layer `SortableGroup` is built on. It registers the
// element its `props.ref` receives as its group's container (only needed for an empty group, or
// to sort to the container's end), follows option changes with `update`, and re-renders at a
// sort's start and end only.
import {
    registerSortableGroup,
    type SortableGroupOptions,
    type SortableGroupState,
} from "@fragiola/dnd/sortable";
import * as React from "react";
import {
    createSlot,
    optionsChanged,
    useSlotState,
} from "../utils/useCoreState";

/** Options of {@link useSortableGroup}: the core's. */
export interface UseSortableGroupOptions extends SortableGroupOptions {}

/** The props {@link useSortableGroup} puts on the container's element. */
export interface SortableGroupHookProps {
    readonly ref: React.RefCallback<HTMLElement>;
    readonly "data-dnd-part": "sortable-group";
    readonly "data-dnd-id": string;
    readonly "data-dnd-sorting"?: "" | undefined;
    readonly "data-dnd-disabled"?: "" | undefined;
    readonly "aria-disabled"?: true | undefined;
}

/** What {@link useSortableGroup} returns: the state, and the props to spread onto the element. */
export interface UseSortableGroupResult {
    readonly state: SortableGroupState;
    readonly props: SortableGroupHookProps;
}

const COMPARED = [
    "group",
    "scope",
    "space",
    "data",
    "disabled",
    "accepts",
    "strategy",
] as const satisfies readonly (keyof UseSortableGroupOptions)[];

/** Makes the element its `props` go on the container of a sortable group, with no provider. */
export function useSortableGroup(
    options: UseSortableGroupOptions,
): UseSortableGroupResult {
    const latest = React.useRef(options);
    latest.current = options;
    const [live] = React.useState(() => ({
        slot: createSlot<SortableGroupState>(() => ({
            sorting: false,
            disabled: !!latest.current.disabled,
        })),
        registration: undefined as
            | ReturnType<typeof registerSortableGroup>
            | undefined,
        applied: options,
    }));
    const ref = React.useCallback(
        (element: HTMLElement | null) => {
            if (!element) return;
            live.applied = latest.current;
            const registration = registerSortableGroup(element, latest.current);
            live.registration = registration;
            const detach = live.slot.attach(registration);
            return () => {
                registration.unregister();
                detach();
                if (live.registration === registration)
                    live.registration = undefined;
            };
        },
        [live],
    );
    React.useLayoutEffect(() => {
        const next = latest.current;
        if (!optionsChanged(live.applied, next, COMPARED)) return;
        live.applied = next;
        live.registration?.update(next);
    });
    const state = useSlotState(live.slot);
    return {
        state,
        props: {
            ref,
            "data-dnd-part": "sortable-group",
            "data-dnd-id": options.group,
            "data-dnd-sorting": state.sorting ? "" : undefined,
            "data-dnd-disabled": state.disabled ? "" : undefined,
            "aria-disabled": state.disabled ? true : undefined,
        },
    };
}
