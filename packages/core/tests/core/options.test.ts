import { describe, expect, it, vi } from "vitest";
import { optionsChanged, withLatestCallbacks } from "../../src/core/options";

describe("the option-change rule", () => {
    const keys = ["id", "accepts", "activation", "data"] as const;
    type Options = {
        id: string;
        accepts?: readonly string[] | ((source: unknown) => boolean);
        activation?: { distance?: number };
        data?: unknown;
        onDrop?: () => void;
    };
    const changed = (previous: Options, next: Options) =>
        optionsChanged(previous, next, keys);

    it("sees no change in identical values, nor in inline arrays and plain objects of the same content", () => {
        const data = new Map();
        expect(changed({ id: "a", data }, { id: "a", data })).toBe(false);
        expect(
            changed(
                { id: "a", accepts: ["card"], activation: { distance: 3 } },
                { id: "a", accepts: ["card"], activation: { distance: 3 } },
            ),
        ).toBe(false);
        expect(
            changed(
                { id: "a", data: Number.NaN },
                { id: "a", data: Number.NaN },
            ),
        ).toBe(false);
    });

    it("sees a change in a compared value, an array's item or length, or a plain object's field", () => {
        expect(changed({ id: "a" }, { id: "b" })).toBe(true);
        expect(
            changed({ id: "a", accepts: ["x"] }, { id: "a", accepts: ["y"] }),
        ).toBe(true);
        expect(
            changed(
                { id: "a", accepts: ["x"] },
                { id: "a", accepts: ["x", "y"] },
            ),
        ).toBe(true);
        expect(
            changed(
                { id: "a", activation: { distance: 3 } },
                { id: "a", activation: {} },
            ),
        ).toBe(true);
        expect(changed({ id: "a" }, { id: "a", accepts: [] })).toBe(true);
    });

    it("compares functions and class instances by identity, and ignores keys it is not given", () => {
        const accepts = () => true;
        expect(changed({ id: "a", accepts }, { id: "a", accepts })).toBe(false);
        expect(
            changed({ id: "a", accepts }, { id: "a", accepts: () => true }),
        ).toBe(true);
        expect(
            changed({ id: "a", data: new Map() }, { id: "a", data: new Map() }),
        ).toBe(true);
        expect(
            changed(
                { id: "a", onDrop: () => {} },
                { id: "a", onDrop: () => {} },
            ),
        ).toBe(false);
    });
});

describe("the latest callbacks", () => {
    it("calls the latest options' callback when the core calls it, and nothing when there is none", () => {
        const first = vi.fn();
        const second = vi.fn();
        let latest: { id: string; onDrop?: (event: string) => void } = {
            id: "a",
            onDrop: first,
        };
        const options = withLatestCallbacks(latest, ["onDrop"], () => latest);
        expect(options.id).toBe("a");
        latest = { id: "a", onDrop: second };
        options.onDrop?.("dropped");
        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledWith("dropped");
        latest = { id: "a" };
        expect(() => options.onDrop?.("again")).not.toThrow();
    });

    it("never mutates the options it is given", () => {
        const given = { id: "a", onDrop: () => {} };
        const options = withLatestCallbacks(given, ["onDrop"], () => given);
        expect(options).not.toBe(given);
        expect(options.onDrop).not.toBe(given.onDrop);
    });
});
