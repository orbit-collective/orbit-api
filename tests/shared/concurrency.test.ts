import {
    describe,
    expect,
    it,
} from "vitest";

import {
    mapWithConcurrency,
} from "@/shared/concurrency";

const tick = () =>
    new Promise(
        resolve =>
            setTimeout(resolve, 1),
    );

describe(
    "mapWithConcurrency",
    () => {
        it(
            "keeps results in input order",
            async () => {
                const results =
                    await mapWithConcurrency(
                        [3, 1, 2],
                        2,
                        async value => {
                            await tick();

                            return value * 10;
                        },
                    );

                expect(results)
                    .toEqual([30, 10, 20]);
            },
        );

        it(
            "never runs more than `limit` calls at once, and does run them in parallel",
            async () => {
                let active = 0;
                let peak = 0;

                await mapWithConcurrency(
                    Array.from(
                        { length: 20 },
                        (_, index) => index,
                    ),
                    4,
                    async () => {
                        active++;
                        peak = Math.max(
                            peak,
                            active,
                        );

                        await tick();

                        active--;
                    },
                );

                expect(peak).toBe(4);
            },
        );

        it(
            "handles an empty list and a limit below one",
            async () => {
                expect(
                    await mapWithConcurrency(
                        [],
                        5,
                        async value => value,
                    ),
                ).toEqual([]);

                expect(
                    await mapWithConcurrency(
                        [1, 2],
                        0,
                        async value => value,
                    ),
                ).toEqual([1, 2]);
            },
        );

        it(
            "rejects when a call rejects",
            async () => {
                await expect(
                    mapWithConcurrency(
                        [1, 2, 3],
                        2,
                        async value => {
                            if (value === 2) {
                                throw new Error("boom");
                            }

                            return value;
                        },
                    ),
                ).rejects.toThrow("boom");
            },
        );
    },
);
