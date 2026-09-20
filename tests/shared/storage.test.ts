import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

const getStore =
    vi.hoisted(
        () =>
            vi.fn(
                () => ({
                    name: "store",
                }),
            ),
    );

vi.mock(
    "@netlify/blobs",
    () => ({
        getStore,
    }),
);

const {
    getOrbitStore,
} = await import(
    "@/shared/storage"
    );

describe(
    "getOrbitStore",
    () => {
        it(
            "opens the orbit store with strong consistency",
            () => {
                const store =
                    getOrbitStore();

                expect(
                    getStore,
                ).toHaveBeenCalledWith({
                    name: "orbit-api",

                    consistency:
                        "strong",
                });

                expect(
                    store,
                ).toEqual({
                    name: "store",
                });
            },
        );
    },
);
