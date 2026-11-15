"use client";

import { Swappable, swapItems } from "@fragiola/dnd-react/swappable";
import { Activity, Gauge, Globe, Timer, Users, Wallet } from "lucide-react";
import { useState } from "react";
import * as styles from "./styles";

// A dashboard whose widgets trade places. Over another widget, only that one moves, into the
// dragged widget's place, and the core marks it `data-dnd-swap-target` (styled in styles.ts):
// nothing else shifts and nothing renders. On the drop the app swaps the two with `swapItems`;
// dropped over no widget, nothing changes.

const WIDGETS = {
    visitors: { label: "Visitors", value: "12.4k", Icon: Users },
    revenue: { label: "Revenue", value: "$8,210", Icon: Wallet },
    uptime: { label: "Uptime", value: "99.98%", Icon: Activity },
    latency: { label: "Latency", value: "142 ms", Icon: Timer },
    regions: { label: "Regions", value: "14", Icon: Globe },
    load: { label: "Load", value: "61%", Icon: Gauge },
};

type Widget = keyof typeof WIDGETS;

const START = Object.keys(WIDGETS) as Widget[];

export default function SwapGrid() {
    const [widgets, setWidgets] = useState(START);
    return (
        <div className={styles.frame}>
            <ul aria-label="Dashboard" className={styles.grid}>
                {widgets.map((widget, index) => {
                    const { label, value, Icon } = WIDGETS[widget];
                    return (
                        <Swappable
                            key={widget}
                            id={widget}
                            index={index}
                            group="dashboard"
                            onSwap={({ source, target, canceled }) => {
                                if (!canceled && target)
                                    setWidgets((now) =>
                                        swapItems(
                                            now,
                                            source.index,
                                            target.index,
                                        ),
                                    );
                            }}
                        >
                            <li aria-label={label} className={styles.widget}>
                                <span className={styles.label}>
                                    <Icon aria-hidden="true" />
                                    {label}
                                </span>
                                <span className={styles.value}>{value}</span>
                            </li>
                        </Swappable>
                    );
                })}
            </ul>
        </div>
    );
}
