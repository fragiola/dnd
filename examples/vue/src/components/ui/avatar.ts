// Vue port of the Fragiola UI avatar (examples/react/src/components/ui/avatar.tsx): the same parts,
// classes and palette roles, over Reka UI's Avatar (the loading-status state machine: the
// fallback shows until the image loads). Each part passes its attributes and template ref on to
// its element, so a dnd component can wrap `Avatar.Root`.

import {
    AvatarFallback as AvatarFallbackPrimitive,
    AvatarImage as AvatarImagePrimitive,
    AvatarRoot as AvatarRootPrimitive,
} from "reka-ui";
import { type Component, defineComponent, h } from "vue";
import { cn } from "#/lib/cn";

/** A part over a Reka UI primitive: its slot, its classes over the consumer's, its slots. */
function part(name: string, primitive: Component, slot: string, base: string) {
    return defineComponent({
        name,
        inheritAttrs: false,
        setup(_, { attrs, slots }) {
            return () =>
                h(
                    primitive,
                    {
                        "data-slot": slot,
                        ...attrs,
                        class: cn(base, attrs.class as string),
                    },
                    slots,
                );
        },
    });
}

export const Avatar = {
    Root: part(
        "AvatarRoot",
        AvatarRootPrimitive,
        "avatar",
        "relative flex size-10 shrink-0 overflow-hidden rounded-full",
    ),
    Image: part(
        "AvatarImage",
        AvatarImagePrimitive,
        "avatar-image",
        "aspect-square size-full object-cover data-[starting-style]:animate-in data-[starting-style]:fade-in-0",
    ),
    Fallback: part(
        "AvatarFallback",
        AvatarFallbackPrimitive,
        "avatar-fallback",
        "absolute inset-0 flex size-full items-center justify-center rounded-full bg-palette-soft text-sm font-medium text-palette-contrast",
    ),
};
