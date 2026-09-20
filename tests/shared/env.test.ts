import {
    afterEach,
    describe,
    expect,
    it,
} from "vitest";

import {
    env,
    optionalEnv,
} from "@/shared/env";

const VARIABLE =
    "ORBIT_TEST_ENV_VARIABLE";

afterEach(
    () => {
        delete process.env[
            VARIABLE
            ];
    },
);

describe(
    "env",
    () => {
        it(
            "returns the configured value",
            () => {
                process.env[
                    VARIABLE
                    ] = "value";

                expect(
                    env(VARIABLE),
                ).toBe("value");
            },
        );

        it(
            "throws when the variable is missing",
            () => {
                expect(
                    () =>
                        env(VARIABLE),
                ).toThrow(
                    `Missing required environment variable: ${VARIABLE}`,
                );
            },
        );

        it(
            "throws when the variable is empty",
            () => {
                process.env[
                    VARIABLE
                    ] = "";

                expect(
                    () =>
                        env(VARIABLE),
                ).toThrow(
                    `Missing required environment variable: ${VARIABLE}`,
                );
            },
        );
    },
);

describe(
    "optionalEnv",
    () => {
        it(
            "returns the configured value",
            () => {
                process.env[
                    VARIABLE
                    ] = "value";

                expect(
                    optionalEnv(
                        VARIABLE,
                    ),
                ).toBe("value");
            },
        );

        it(
            "returns undefined when the variable is missing",
            () => {
                expect(
                    optionalEnv(
                        VARIABLE,
                    ),
                ).toBeUndefined();
            },
        );
    },
);
