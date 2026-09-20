import {
    describe,
    expect,
    it,
} from "vitest";

import {
    getErrorMessage,
} from "@/shared/error-message";

describe(
    "getErrorMessage",
    () => {
        it(
            "returns the message of an error instance",
            () => {
                expect(
                    getErrorMessage(
                        new Error(
                            "boom",
                        ),
                    ),
                ).toBe("boom");
            },
        );

        it(
            "falls back for non-error values",
            () => {
                expect(
                    getErrorMessage(
                        "boom",
                    ),
                ).toBe(
                    "Unknown error",
                );

                expect(
                    getErrorMessage(
                        undefined,
                    ),
                ).toBe(
                    "Unknown error",
                );
            },
        );
    },
);
