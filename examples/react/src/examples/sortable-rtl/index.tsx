"use client";

import {
    arrayMove,
    grid,
    horizontalList,
    Sortable,
    type SortEndEvent,
} from "@fragiola/dnd-react/sortable";
import { useState } from "react";
import * as styles from "./styles";

// Right to left, in Arabic: nothing to configure. The strategies read the direction from the page,
// so the row of tabs flows from the right and the grid fills its rows from the right, as the page
// does. The keyboard follows reading order: ArrowLeft moves an item forward, toward the inline end.

const TABS: Record<string, string> = {
    home: "الرئيسية",
    reports: "التقارير",
    team: "الفريق",
    settings: "الإعدادات",
};

const APPS: Record<string, string> = {
    mail: "البريد",
    calendar: "التقويم",
    notes: "الملاحظات",
    files: "الملفات",
    photos: "الصور",
    music: "الموسيقى",
};

/** One list the user sorts, applied with `arrayMove`. */
function useOrder(start: string[]) {
    const [order, setOrder] = useState(start);
    const onSortEnd = ({ from, to, canceled }: SortEndEvent) => {
        if (!canceled) setOrder((now) => arrayMove(now, from.index, to.index));
    };
    return [order, onSortEnd] as const;
}

export default function SortableRtl() {
    const [tabs, onTabs] = useOrder(Object.keys(TABS));
    const [apps, onApps] = useOrder(Object.keys(APPS));
    return (
        <div dir="rtl" lang="ar" className={styles.frame}>
            <ul aria-label="علامات التبويب" className={styles.tabs}>
                {tabs.map((id, index) => (
                    <Sortable
                        key={id}
                        id={id}
                        index={index}
                        group="tabs"
                        strategy={horizontalList}
                        onSortEnd={onTabs}
                    >
                        <li aria-label={TABS[id]} className={styles.tab}>
                            {TABS[id]}
                        </li>
                    </Sortable>
                ))}
            </ul>
            <ul aria-label="التطبيقات" className={styles.grid}>
                {apps.map((id, index) => (
                    <Sortable
                        key={id}
                        id={id}
                        index={index}
                        group="apps"
                        strategy={grid}
                        onSortEnd={onApps}
                    >
                        <li aria-label={APPS[id]} className={styles.app}>
                            <span className={styles.icon} />
                            {APPS[id]}
                        </li>
                    </Sortable>
                ))}
            </ul>
        </div>
    );
}
