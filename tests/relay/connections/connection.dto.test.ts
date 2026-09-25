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

describe("toConnectionDto", () => {
    it("does not expose secret hashes", () => {
        const {
            connection,
        } = createConnection();

        const dto =
            toConnectionDto(
                connection,
            );

        expect(dto).not.toHaveProperty(
            "tokenHash",
        );

        expect(dto).not.toHaveProperty(
            "stateHash",
        );

        expect(dto).not.toHaveProperty(
            "stateExpiresAt",
        );
    });

    it("returns an empty repository list for a pending connection", () => {
        const {
            connection,
        } = createConnection();

        const dto =
            toConnectionDto(
                connection,
            );

        expect(
            dto.repositories,
        ).toEqual([]);

        expect(
            dto.status,
        ).toBe("pending");
    });

    it("maps every repository passed in", () => {
        const {
            connection,
        } = createConnection();

        const dto =
            toConnectionDto(
                connection,
                [
                    {
                        connectionId:
                        connection.id,

                        installationId:
                            123,

                        repositoryId:
                            456,

                        owner:
                            "orbit-collective",

                        name:
                            "orbit",

                        addedAt:
                            "2026-09-24T00:00:00.000Z",
                    },
                ],
            );

        expect(
            dto.repositories,
        ).toEqual([
            {
                id: 456,
                owner: "orbit-collective",
                name: "orbit",
            },
        ]);
    });
});