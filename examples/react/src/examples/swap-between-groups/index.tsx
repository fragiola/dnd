"use client";

import { Swappable, swapBetween } from "@fragiola/dnd-react/swappable";
import { useState } from "react";
import * as styles from "./styles";

// Two groups that swap with each other: a starting lineup and its bench. A player swaps with a
// teammate of the lineup, or with a substitute (both groups list each other in `accepts`). The app
// keeps one list per group and applies each swap with `swapBetween`, which takes the event as it
// is: the source's and the target's group and index.

type Group = "lineup" | "bench";

const GROUPS: { id: Group; title: string }[] = [
    { id: "lineup", title: "Lineup" },
    { id: "bench", title: "Bench" },
];

const ACCEPTS: Group[] = ["lineup", "bench"];

const START: Record<Group, readonly string[]> = {
    lineup: ["Ana", "Bruno", "Chiara", "Dev", "Emeka"],
    bench: ["Farah", "Goran", "Hana"],
};

export default function SwapBetweenGroups() {
    const [team, setTeam] = useState(START);
    return (
        <div className={styles.frame}>
            {GROUPS.map((group) => (
                <section key={group.id} className={styles.group}>
                    <h3 className={styles.title}>{group.title}</h3>
                    <ol aria-label={group.title} className={styles.players}>
                        {team[group.id].map((name, index) => (
                            <Swappable
                                key={name}
                                id={name}
                                index={index}
                                group={group.id}
                                accepts={ACCEPTS}
                                onSwap={(event) =>
                                    setTeam((now) => swapBetween(now, event))
                                }
                            >
                                <li aria-label={name} className={styles.player}>
                                    <span className={styles.number}>
                                        {index + 1}
                                    </span>
                                    {name}
                                </li>
                            </Swappable>
                        ))}
                    </ol>
                </section>
            ))}
        </div>
    );
}
