import { Component, signal } from "@angular/core";
import {
    arrayMove,
    DndDragHandle,
    DndSortable,
    horizontalList,
    type SortEndEvent,
} from "@fragiola/dnd-angular/sortable";
import { LucideGripVertical } from "@lucide/angular";
import { ClickableButton } from "#/components/atoms/clickable";
import { AVATAR } from "#/components/ui/avatar";
import { SWITCH } from "#/components/ui/switch";
import * as styles from "./styles";

// Fragiola UI items, vendored as any app gets them (a copy-paste registry), sorted as they are.
// `[dndSortable]` sits on the component's own element and adds no element: a `[kitAvatar]` keeps
// its own classes and `data-slot`, and dnd's `data-dnd-*` and `translate` sit beside them. In the
// list, a Fragiola `kitClickable` button is the drag handle, and each row's `kitSwitch` keeps its
// own handler: a press on it toggles, and never starts a sort (a native control never drags).

const PEOPLE: Record<string, string> = {
    ada: "Ada Lovelace",
    alan: "Alan Turing",
    grace: "Grace Hopper",
    linus: "Linus Torvalds",
    margaret: "Margaret Hamilton",
};

const CHANNELS: Record<string, string> = {
    email: "Email",
    push: "Push notifications",
    sms: "Text messages",
    digest: "Weekly digest",
};

const initials = (name: string) =>
    name
        .split(" ")
        .map((word) => word[0])
        .join("");

/** One list the user sorts, applied with `arrayMove`. */
function createOrder(start: string[]) {
    const order = signal(start);
    const onSortEnd = ({ from, to, canceled }: SortEndEvent) => {
        if (!canceled)
            order.update((now) => arrayMove(now, from.index, to.index));
    };
    return [order.asReadonly(), onSortEnd] as const;
}

@Component({
    selector: "example-sortable-fragiola-ui",
    imports: [
        AVATAR,
        SWITCH,
        ClickableButton,
        DndSortable,
        DndDragHandle,
        LucideGripVertical,
    ],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <section [class]="styles.section">
                <h3 [class]="styles.title">Reviewers, in order</h3>
                <div [class]="styles.avatars">
                    @for (id of people(); track id) {
                        <!-- the Fragiola UI component itself is the sortable item -->
                        <span
                            kitAvatar
                            [dndSortable]="id"
                            [index]="$index"
                            group="reviewers"
                            [strategy]="horizontalList"
                            (sortEnd)="onPeople($event)"
                            [attr.aria-label]="peopleNames[id]"
                            [class]="styles.avatar"
                        >
                            <span kitAvatarFallback>{{ initials(peopleNames[id] ?? id) }}</span>
                        </span>
                    }
                </div>
            </section>
            <section [class]="styles.section">
                <h3 [class]="styles.title">Channels, by priority</h3>
                <ol aria-label="Channels" [class]="styles.channels">
                    @for (id of channels(); track id) {
                        <li
                            [dndSortable]="id"
                            [index]="$index"
                            group="channels"
                            (sortEnd)="onChannels($event)"
                            [attr.aria-label]="channelNames[id]"
                            [class]="styles.row"
                        >
                            <button
                                kitClickable
                                dndDragHandle
                                variant="icon"
                                shape="square"
                                size="sm"
                                [attr.aria-label]="'Move ' + channelNames[id]"
                                [class]="styles.handle"
                            >
                                <svg lucideGripVertical aria-hidden="true"></svg>
                            </button>
                            <span [class]="styles.label">{{ channelNames[id] }}</span>
                            <button
                                kitSwitch
                                [checked]="!!enabled()[id]"
                                (checkedChange)="toggle(id, $event)"
                                [attr.aria-label]="channelNames[id] + ' on'"
                            >
                                <span kitSwitchThumb></span>
                            </button>
                        </li>
                    }
                </ol>
            </section>
        </div>
    `,
})
export default class SortableFragiolaUi {
    protected readonly styles = styles;
    protected readonly peopleNames = PEOPLE;
    protected readonly channelNames = CHANNELS;
    protected readonly initials = initials;
    protected readonly horizontalList = horizontalList;
    protected readonly enabled = signal<Record<string, boolean>>({
        email: true,
        digest: true,
    });
    private readonly peopleOrder = createOrder(Object.keys(PEOPLE));
    private readonly channelsOrder = createOrder(Object.keys(CHANNELS));
    protected readonly people = this.peopleOrder[0];
    protected readonly onPeople = this.peopleOrder[1];
    protected readonly channels = this.channelsOrder[0];
    protected readonly onChannels = this.channelsOrder[1];

    protected toggle(id: string, checked: boolean) {
        this.enabled.update((now) => ({ ...now, [id]: checked }));
    }
}
