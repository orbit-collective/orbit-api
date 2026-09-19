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

    it("returns null repository for pending connection", () => {
        const {
            connection,
        } = createConnection();

        const dto =
            toConnectionDto(
                connection,
            );

        expect(
            dto.repository,
        ).toBeNull();

        expect(
            dto.status,
        ).toBe("pending");
    });
});