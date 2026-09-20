import {
    describe,
    expect,
    it,
} from "vitest";

import {
    secureCompare,
    sha256,
} from "@/security/hash";

describe(
    "sha256",
    () => {
        it(
            "hashes deterministically",
            () => {
                expect(
                    sha256("orbit"),
                ).toBe(
                    sha256("orbit"),
                );

                expect(
                    sha256("orbit"),
                ).toMatch(
                    /^[0-9a-f]{64}$/,
                );
            },
        );

        it(
            "produces different hashes for different values",
            () => {
                expect(
                    sha256("orbit"),
                ).not.toBe(
                    sha256("orbit2"),
                );
            },
        );
    },
);

describe(
    "secureCompare",
    () => {
        it(
            "accepts equal values",
            () => {
                expect(
                    secureCompare(
                        "token",
                        "token",
                    ),
                ).toBe(true);
            },
        );

        it(
            "rejects values of equal length that differ",
            () => {
                expect(
                    secureCompare(
                        "token",
                        "toker",
                    ),
                ).toBe(false);
            },
        );

        it(
            "rejects values of different length",
            () => {
                expect(
                    secureCompare(
                        "token",
                        "token-longer",
                    ),
                ).toBe(false);
            },
        );
    },
);
