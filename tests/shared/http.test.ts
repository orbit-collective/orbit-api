import {
    describe,
    expect,
    it,
} from "vitest";

import {
    failure,
    json,
    success,
} from "@/shared/http";

describe(
    "http responses",
    () => {
        it(
            "serialises json with utf-8 content type",
            async () => {
                const response =
                    json({
                        hello: "world",
                    });

                expect(
                    response.headers.get(
                        "Content-Type",
                    ),
                ).toBe(
                    "application/json; charset=utf-8",
                );

                expect(
                    await response.json(),
                ).toEqual({
                    hello: "world",
                });
            },
        );

        it(
            "keeps custom headers and status passed in init",
            async () => {
                const response =
                    json(
                        {
                            ok: true,
                        },
                        {
                            status: 201,

                            headers: {
                                "X-Request-Id":
                                    "abc",
                            },
                        },
                    );

                expect(
                    response.status,
                ).toBe(201);

                expect(
                    response.headers.get(
                        "X-Request-Id",
                    ),
                ).toBe("abc");
            },
        );

        it(
            "wraps success payloads",
            async () => {
                const response =
                    success({
                        id: "connection-1",
                    });

                expect(
                    response.status,
                ).toBe(200);

                expect(
                    await response.json(),
                ).toEqual({
                    success: true,

                    data: {
                        id: "connection-1",
                    },
                });
            },
        );

        it(
            "wraps success payloads with a custom status",
            () => {
                expect(
                    success(
                        {
                            id: "connection-1",
                        },
                        201,
                    ).status,
                ).toBe(201);
            },
        );

        it(
            "wraps failure payloads",
            async () => {
                const response =
                    failure(
                        "INVALID_REQUEST",
                        "Request is invalid.",
                    );

                expect(
                    response.status,
                ).toBe(400);

                expect(
                    await response.json(),
                ).toEqual({
                    success: false,

                    error: {
                        code:
                            "INVALID_REQUEST",

                        message:
                            "Request is invalid.",
                    },
                });
            },
        );

        it(
            "wraps failure payloads with a custom status",
            () => {
                expect(
                    failure(
                        "NOT_FOUND",
                        "Missing.",
                        404,
                    ).status,
                ).toBe(404);
            },
        );
    },
);
