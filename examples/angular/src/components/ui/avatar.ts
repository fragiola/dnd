// Angular port of the Fragiola UI avatar (examples/react/src/components/ui/avatar.tsx): the same
// parts, classes and palette roles, as directives on your own elements. Base UI's loading-status
// state machine is the root's `status` signal: the fallback shows until the image loads, and an
// image that fails to load stays hidden. The root is an attribute directive, so another directive
// (a dnd part) can sit on the same element.
//
//     <span kitAvatar aria-label="Ada Lovelace"><span kitAvatarFallback>AL</span></span>

import { computed, Directive, inject, input, signal } from "@angular/core";
import { cn } from "#/lib/cn";

/** Where the root's image is: Base UI's statuses. */
export type AvatarStatus = "idle" | "loading" | "loaded" | "error";

@Directive({
    selector: "[kitAvatar]",
    host: {
        "data-slot": "avatar",
        "[class]": "classes()",
    },
})
export class AvatarRoot {
    readonly class = input<string>();
    /** the image's loading status (`idle` without an image) */
    readonly status = signal<AvatarStatus>("idle");
    protected readonly classes = computed(() =>
        cn(
            "relative flex size-10 shrink-0 overflow-hidden rounded-full",
            this.class(),
        ),
    );
}

@Directive({
    selector: "img[kitAvatarImage]",
    host: {
        "data-slot": "avatar-image",
        "[attr.data-status]": "root.status()",
        "[hidden]": "root.status() !== 'loaded'",
        "[class]": "classes()",
        "(load)": "root.status.set('loaded')",
        "(error)": "root.status.set('error')",
    },
})
export class AvatarImage {
    readonly class = input<string>();
    protected readonly root = inject(AvatarRoot);
    protected readonly classes = computed(() =>
        cn(
            "aspect-square size-full object-cover",
            "data-[starting-style]:animate-in data-[starting-style]:fade-in-0",
            this.class(),
        ),
    );

    constructor() {
        this.root.status.set("loading");
    }
}

@Directive({
    selector: "[kitAvatarFallback]",
    host: {
        "data-slot": "avatar-fallback",
        "[hidden]": "root.status() === 'loaded'",
        "[class]": "classes()",
    },
})
export class AvatarFallback {
    readonly class = input<string>();
    protected readonly root = inject(AvatarRoot);
    protected readonly classes = computed(() =>
        cn(
            "absolute inset-0 flex size-full items-center justify-center rounded-full bg-palette-soft text-sm font-medium text-palette-contrast",
            this.class(),
        ),
    );
}

/** Every part of an avatar, for a component's `imports`. */
export const AVATAR = [AvatarRoot, AvatarImage, AvatarFallback] as const;
