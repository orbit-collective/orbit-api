import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    ApiError,
    handleRequest,
} from "@/shared/errors";

describe(
    "handleRequest",
    () => {
        it(
            "serializes ApiError",
            async () => {
                const response =
                    await handleRequest(
                        async () => {
                            throw new ApiError(
                                "TEST_ERROR",
                                "Something failed.",
                                418,
                            );
                        },
                    );

                expect(
                    response.status,
                ).toBe(418);

                await expect(
                    response.json(),
                ).resolves.toEqual({
                    success:
                        false,

                    error: {
                        code:
                            "TEST_ERROR",

                        message:
                            "Something failed.",
                    },
                });
            },
        );

        it(
            "hides unexpected internal errors",
            async () => {
                const consoleSpy =
                    vi
                        .spyOn(
                            console,
                            "error",
                        )
                        .mockImplementation(
                            () => {},
                        );

                const response =
                    await handleRequest(
                        async () => {
                            throw new Error(
                                "database-password-is-secret",
                            );
                        },
                    );

                expect(
                    response.status,
                ).toBe(500);

                const body =
                    await response.json();

                expect(
                    body,
                ).toEqual({
                    success:
                        false,

                    error: {
                        code:
                            "INTERNAL_SERVER_ERROR",

                        message:
                            "An unexpected error occurred.",
                    },
                });

                expect(
                    JSON.stringify(
                        body,
                    ),
                ).not.toContain(
                    "database-password-is-secret",
                );

                consoleSpy
                    .mockRestore();
            },
        );
    },
);