import { Component, signal } from "@angular/core";
import { DndDragOverlay, type DragId } from "@fragiola/dnd-angular";
import {
    DndSortable,
    DndSortableGroup,
    moveBetween,
    type SortEndEvent,
} from "@fragiola/dnd-angular/sortable";
import { createModel, DOCKABLE } from "@fragiola/dockable-angular";
import { LucideMusic } from "@lucide/angular";
import { type NoteTypes, playlistLayout } from "../_kit/dockable";
import { MovePlaylist } from "./move-playlist";
import * as styles from "./styles";

// Sortable lists inside Dockable panels. Dockable moves a panel's content when its tab moves to
// another tabset (or into a popout) without remounting it; dnd measures when a sort starts and
// registers each item in its own document's drag space, so the list keeps sorting wherever the
// panel went. Move the Playlist tab with the button (Dockable's `tab.move`) or by dragging the tab
// (Dockable's own drag), and sort again. The queue accepts songs from the playlist and back. A
// panel clips its content, so the item stays in its list as the placeholder
// (`[translate]="false"`, the core shifts it to where it lands) and a `dndDragOverlay` carries a
// copy across the panels.

type List = "playlist" | "queue";

const SONGS: Record<string, string> = {
    tide: "Low Tide",
    lanterns: "Paper Lanterns",
    north: "Due North",
    static: "Static Bloom",
    quiet: "The Quiet Part",
    orbit: "Slow Orbit",
};

const ACCEPTS: List[] = ["playlist", "queue"];

const TITLES: Record<List, string> = { playlist: "Playlist", queue: "Queue" };

const isList = (id: string): id is List => id === "playlist" || id === "queue";

@Component({
    selector: "example-sortable-dockable",
    imports: [
        DOCKABLE,
        DndSortable,
        DndSortableGroup,
        DndDragOverlay,
        LucideMusic,
        MovePlaylist,
    ],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <example-sortable-dockable-move-playlist [model]="model" />
            <div [dockableRoot]="model" [class]="styles.root">
                <!-- The developer owns Dockable's recursion: a row, or a tabset with its tabs. -->
                <div dockableRow>
                    <ng-template [dockableRowChild]="model" let-node>
                        @if (node.type === "row") {
                            <div [dockableRow]="node"></div>
                        } @else {
                            <div [dockableTabSet]="node" [class]="styles.tabset">
                                <div
                                    dockableTabList
                                    [attr.aria-label]="'Tabs of ' + node.id"
                                    [class]="styles.tabList"
                                >
                                    <ng-template [dockableTabListItem]="model" let-tab>
                                        <div [dockableTab]="tab" [class]="styles.tab">{{ tab.label }}</div>
                                    </ng-template>
                                </div>
                                <div dockableTabSetContent></div>
                            </div>
                        }
                    </ng-template>
                </div>
                <ng-template [dockablePanels]="model" let-tab>
                    <div [dockablePanel]="tab" [class]="styles.panel">
                        @if (isList(tab.id)) {
                            <ol
                                [dndSortableGroup]="tab.id"
                                [accepts]="accepts"
                                [attr.aria-label]="titles[tab.id]"
                                [class]="styles.list"
                            >
                                @for (id of lists()[tab.id]; track id) {
                                    <li
                                        [dndSortable]="id"
                                        [index]="$index"
                                        [group]="tab.id"
                                        [accepts]="accepts"
                                        [translate]="false"
                                        (sortEnd)="sortEnd($event)"
                                        [attr.aria-label]="songs[id]"
                                        [class]="styles.song"
                                    >
                                        <svg lucideMusic aria-hidden="true"></svg>
                                        {{ songs[id] }}
                                    </li>
                                }
                            </ol>
                        } @else {
                            <p [class]="styles.note">{{ tab.data.text }}</p>
                        }
                    </div>
                </ng-template>
                <div
                    dockableDropIndicator
                    #indicator="dockableDropIndicator"
                    [class]="styles.dropIndicator(indicator.state())"
                ></div>
            </div>
            <ng-template dndDragOverlay let-operation>
                <div [class]="styles.lifted">
                    <svg lucideMusic aria-hidden="true"></svg>
                    {{ song(operation.source.id) }}
                </div>
            </ng-template>
        </div>
    `,
})
export default class SortableDockable {
    protected readonly styles = styles;
    protected readonly songs = SONGS;
    protected readonly accepts = ACCEPTS;
    protected readonly titles = TITLES;
    protected readonly isList = isList;
    // the model is the source of truth: create it once
    protected readonly model = createModel<NoteTypes>(playlistLayout());
    protected readonly lists = signal<Record<List, readonly string[]>>({
        playlist: ["tide", "lanterns", "north", "static"],
        queue: ["quiet", "orbit"],
    });

    protected song(id: DragId) {
        return SONGS[String(id)];
    }

    protected sortEnd(event: SortEndEvent) {
        this.lists.update((now) => moveBetween(now, event));
    }
}
