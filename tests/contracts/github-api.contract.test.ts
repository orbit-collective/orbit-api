import {
    describe,
    expect,
    it,
} from "vitest";

import {
    createConnection,
} from "@/relay/connections/connection.factory";

import {
    toConnectionDto,
} from "@/relay/connections/connection.dto";

describe(
    "GitHub API contract",
    () => {
        it(
            "connection response never exposes secret hashes",
            () => {
                const {
                    connection,
                } =
                    createConnection();

                const response =
                    toConnectionDto(
                        connection,
                    );

                expect(
                    response,
                ).not.toHaveProperty(
                    "tokenHash",
                );

                expect(
                    response,
                ).not.toHaveProperty(
                    "stateHash",
                );

                expect(
                    response,
                ).not.toHaveProperty(
                    "stateExpiresAt",
                );
            },
        );

        it(
            "pending connection has null GitHub repository",
            () => {
                const {
                    connection,
                } =
                    createConnection();

                const response =
                    toConnectionDto(
                        connection,
                    );

                expect(
                    response.status,
                ).toBe(
                    "pending",
                );

                expect(
                    response.repository,
                ).toBeNull();
            },
        );
    },
);