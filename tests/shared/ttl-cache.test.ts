import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    TtlCache,
} from "@/shared/ttl-cache";

describe("TtlCache", () => {
    it("returns a value until it expires", () => {
        let now = 1_000;
        const cache = new TtlCache<string>(() => now);

        cache.set("a", "x", 100);

        expect(cache.get("a")).toBe("x");

        now = 1_099;
        expect(cache.get("a")).toBe("x");

        now = 1_100;
        expect(cache.get("a")).toBeUndefined();
    });

    it("loads once per ttl with remember()", async () => {
        let now = 0;
        const cache = new TtlCache<number>(() => now);
        const load = vi.fn().mockResolvedValue(7);

        expect(await cache.remember("k", 50, load)).toBe(7);
        expect(await cache.remember("k", 50, load)).toBe(7);
        expect(load).toHaveBeenCalledTimes(1);

        now = 60;
        await cache.remember("k", 50, load);
        expect(load).toHaveBeenCalledTimes(2);
    });

    it("does not cache a failed load", async () => {
        const cache = new TtlCache<number>();
        const load = vi
            .fn()
            .mockRejectedValueOnce(new Error("x"))
            .mockResolvedValueOnce(1);

        await expect(cache.remember("k", 50, load)).rejects.toThrow("x");
        expect(await cache.remember("k", 50, load)).toBe(1);
    });

    it("can be cleared", () => {
        const cache = new TtlCache<string>();
        cache.set("a", "x", 1000);
        cache.clear();

        expect(cache.get("a")).toBeUndefined();
    });
});
