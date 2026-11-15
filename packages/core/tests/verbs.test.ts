// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
    type CommandResult,
    createDragSpace,
    type DropContext,
    type DropPayload,
    getDragSpace,
} from "../src";
import { draggable, droppable, pointer } from "./harness";

const LEFT = { x: 100, y: 0, width: 100, height: 100 };
const RIGHT = { x: 300, y: 0, width: 100, height: 100 };
const vetoed: CommandResult<DropPayload> = {
    ok: false,
    error: { code: "vetoed", message: "Not here." },
};

describe("the drag space's verbs", () => {
    it("gets the operation, the ids and the states, and asks the questions", () => {
        const space = getDragSpace(document);
        const zone = droppable({ id: "z" }, LEFT);
        const { element } = draggable({ id: "c" });
        expect(space.get("draggable-ids")).toEqual(["c"]);
        expect(space.get("droppable-ids")).toEqual(["z"]);
        expect(space.get("operation")).toBeUndefined();
        expect(space.is("dragging")).toBe(false);
        expect(
            space.get("draggable-state-by", { draggableId: "nope" }),
        ).toBeUndefined();
        const press = pointer(element, 10, 10);
        press.move(150, 50);
        expect(space.is("dragging")).toBe(true);
        expect(space.is("draggable-dragging", { draggableId: "c" })).toBe(true);
        expect(space.is("draggable-dragging", { draggableId: "x" })).toBe(
            false,
        );
        expect(space.is("droppable-over", { droppableId: "z" })).toBe(true);
        expect(space.get("draggable-state-by", { draggableId: "c" })).toEqual({
            dragging: true,
            disabled: false,
        });
        expect(space.get("droppable-state-by", { droppableId: "z" })).toBe(
            zone.registration.getState(),
        );
        expect(space.get("operation")?.target?.id).toBe("z");
        press.release(150, 50);
    });

    it("runs cancel on the drag in progress, and says not_found when there is none", () => {
        const space = getDragSpace(document);
        const onDragCancel = vi.fn();
        const { element } = draggable({ id: "c", onDragCancel });
        expect(space.run("cancel")).toMatchObject({
            ok: false,
            error: { code: "not_found" },
        });
        const press = pointer(element, 10, 10);
        press.move(50, 50);
        expect(space.run("cancel")).toEqual({ ok: true, value: {} });
        expect(onDragCancel).toHaveBeenCalledOnce();
        expect(element.style.translate).toBe("");
    });

    it("can and checks a drop through accepts, scope and the middleware, as a dry run", () => {
        const space = getDragSpace(document);
        droppable({ id: "photos", accepts: ["photo"] }, LEFT);
        droppable({ id: "other", scope: "b" }, RIGHT);
        droppable({ id: "any" }, RIGHT);
        draggable({ id: "c", type: "card" });
        expect(
            space.check("drop", { draggableId: "c", droppableId: "any" }),
        ).toEqual({
            ok: true,
            value: { draggableId: "c", droppableId: "any" },
        });
        expect(
            space.can("drop", { draggableId: "c", droppableId: "photos" }),
        ).toBe(false);
        expect(
            space.check("drop", { draggableId: "c", droppableId: "photos" }),
        ).toMatchObject({
            ok: false,
            error: { code: "refused" },
        });
        expect(
            space.check("drop", { draggableId: "c", droppableId: "other" }),
        ).toMatchObject({
            ok: false,
            error: { code: "refused" },
        });
        expect(
            space.check("drop", { draggableId: "x", droppableId: "any" }),
        ).toMatchObject({
            ok: false,
            error: { code: "not_found" },
        });
        const seen: DropContext[] = [];
        const remove = space.use((ctx, next) => {
            seen.push(ctx);
            return ctx.payload.droppableId === "any" ? vetoed : next();
        });
        expect(
            space.check("drop", { draggableId: "c", droppableId: "any" }),
        ).toEqual(vetoed);
        expect(seen[0]).toMatchObject({
            command: "drop",
            dryRun: true,
            source: { id: "c", type: "card" },
            target: { id: "any" },
        });
        remove();
        expect(
            space.can("drop", { draggableId: "c", droppableId: "any" }),
        ).toBe(true);
    });

    it("never throws: a middleware that throws is a middleware_error", () => {
        const space = createDragSpace({ document });
        droppable({ id: "z", space }, LEFT);
        draggable({ id: "c", space });
        space.use(() => {
            throw new Error("boom");
        });
        expect(
            space.check("drop", { draggableId: "c", droppableId: "z" }),
        ).toMatchObject({
            ok: false,
            error: { code: "middleware_error", message: "Error: boom" },
        });
    });

    it("runs the middleware outermost first, each able to see what the inner ones said", () => {
        const space = createDragSpace({ document });
        droppable({ id: "z", space }, LEFT);
        draggable({ id: "c", space });
        const order: string[] = [];
        space.use((_ctx, next) => {
            order.push("outer");
            const result = next();
            order.push(`outer saw ${result.ok}`);
            return result;
        });
        space.use(() => {
            order.push("inner");
            return vetoed;
        });
        space.check("drop", { draggableId: "c", droppableId: "z" });
        expect(order).toEqual(["outer", "inner", "outer saw false"]);
    });
});

describe("drop middleware in a drag", () => {
    it("asks once per target change as a dry run, and marks a vetoed hover refused", () => {
        const space = createDragSpace({ document });
        const left = droppable({ id: "left", space }, LEFT);
        droppable({ id: "right", space }, RIGHT);
        const asked: string[] = [];
        space.use((ctx, next) => {
            asked.push(`${ctx.payload.droppableId} ${ctx.dryRun}`);
            return ctx.payload.droppableId === "left" ? vetoed : next();
        });
        const { element } = draggable({ id: "c", space });
        const press = pointer(element, 10, 10);
        press.move(150, 50);
        press.move(160, 50);
        press.move(170, 50);
        expect(left.registration.getState()).toMatchObject({
            over: false,
            refused: true,
        });
        expect(space.get("operation")?.target).toBeUndefined();
        press.move(350, 50);
        expect(space.get("operation")?.target?.id).toBe("right");
        press.release(350, 50);
        expect(asked).toEqual(["left true", "right true", "right false"]);
    });

    it("runs for real on the drop, before onDrop and onDragEnd; a veto delivers no onDrop", () => {
        const space = createDragSpace({ document });
        const log: string[] = [];
        droppable({ id: "z", space, onDrop: () => log.push("onDrop") }, LEFT);
        let allow = true;
        space.use((ctx, next) => {
            log.push(`middleware ${ctx.dryRun}`);
            return allow || ctx.dryRun ? next() : vetoed;
        });
        const { element } = draggable({
            id: "c",
            space,
            onDragEnd: (event) =>
                log.push(`onDragEnd ${event.operation.target?.id}`),
        });
        let press = pointer(element, 10, 10);
        press.move(150, 50);
        press.release(150, 50);
        expect(log).toEqual([
            "middleware true",
            "middleware false",
            "onDrop",
            "onDragEnd z",
        ]);

        log.length = 0;
        allow = false;
        press = pointer(element, 10, 10);
        press.move(150, 50);
        press.release(150, 50);
        // vetoed on release: dropped nowhere
        expect(log).toEqual([
            "middleware true",
            "middleware false",
            "onDragEnd undefined",
        ]);
    });
});
