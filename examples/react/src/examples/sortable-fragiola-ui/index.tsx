"use client";

import {
    arrayMove,
    DragHandle,
    horizontalList,
    Sortable,
    type SortEndEvent,
} from "@fragiola/dnd-react/sortable";
import { GripVertical } from "lucide-react";
import { useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { Avatar } from "#/components/ui/avatar";
import { Switch } from "#/components/ui/switch";
import * as styles from "./styles";

// Fragiola UI items, vendored as any app gets them (a copy-paste registry), sorted as they are.
// `Sortable` clones the component it wraps and renders no element: an `Avatar.Root` keeps its own
// classes and `data-slot`, and dnd's `data-dnd-*` and `translate` sit beside them. In the list, a
// Fragiola `Clickable.Button` is the drag handle, and each row's `Switch` keeps its own handler: a
// press on it toggles, and never starts a sort (a native control never drags).

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
function useOrder(start: string[]) {
    const [order, setOrder] = useState(start);
    const onSortEnd = ({ from, to, canceled }: SortEndEvent) => {
        if (!canceled) setOrder((now) => arrayMove(now, from.index, to.index));
    };
    return [order, onSortEnd] as const;
}

export default function SortableFragiolaUi() {
    const [people, onPeople] = useOrder(Object.keys(PEOPLE));
    const [channels, onChannels] = useOrder(Object.keys(CHANNELS));
    const [enabled, setEnabled] = useState<Record<string, boolean>>({
        email: true,
        digest: true,
    });
    return (
        <div className={styles.frame}>
            <section className={styles.section}>
                <h3 className={styles.title}>Reviewers, in order</h3>
                <div className={styles.avatars}>
                    {people.map((id, index) => (
                        <Sortable
                            key={id}
                            id={id}
                            index={index}
                            group="reviewers"
                            strategy={horizontalList}
                            onSortEnd={onPeople}
                        >
                            {/* the Fragiola UI component itself is the sortable item */}
                            <Avatar.Root
                                aria-label={PEOPLE[id]}
                                className={styles.avatar}
                            >
                                <Avatar.Fallback>
                                    {initials(PEOPLE[id] ?? id)}
                                </Avatar.Fallback>
                            </Avatar.Root>
                        </Sortable>
                    ))}
                </div>
            </section>
            <section className={styles.section}>
                <h3 className={styles.title}>Channels, by priority</h3>
                <ol aria-label="Channels" className={styles.channels}>
                    {channels.map((id, index) => (
                        <Sortable
                            key={id}
                            id={id}
                            index={index}
                            group="channels"
                            onSortEnd={onChannels}
                        >
                            <li
                                aria-label={CHANNELS[id]}
                                className={styles.row}
                            >
                                <DragHandle>
                                    <Clickable.Button
                                        variant="icon"
                                        shape="square"
                                        size="sm"
                                        aria-label={`Move ${CHANNELS[id]}`}
                                        className={styles.handle}
                                    >
                                        <GripVertical aria-hidden="true" />
                                    </Clickable.Button>
                                </DragHandle>
                                <span className={styles.label}>
                                    {CHANNELS[id]}
                                </span>
                                <Switch.Root
                                    checked={!!enabled[id]}
                                    onCheckedChange={(checked) =>
                                        setEnabled((now) => ({
                                            ...now,
                                            [id]: checked,
                                        }))
                                    }
                                    aria-label={`${CHANNELS[id]} on`}
                                >
                                    <Switch.Thumb />
                                </Switch.Root>
                            </li>
                        </Sortable>
                    ))}
                </ol>
            </section>
        </div>
    );
}
