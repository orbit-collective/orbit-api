import {
    describe,
    expect,
    it,
} from "vitest";

import {
    createConnection,
} from "@/relay/connections/connection.factory";
import {
    sha256,
} from "@/security/hash";

describe("createConnection", () => {
    it("creates pending GitHub connection", () => {
        const result =
            createConnection();

        expect(
            result.connection.status,
        ).toBe("pending");

        expect(
            result.connection.installationId,
        ).toBeNull();

        expect(
            result.connection.repositoryId,
        ).toBeNull();

        expect(
            result.token.startsWith(
                "orb_local_",
            ),
        ).toBe(true);
    });

    it("stores only token hash in connection", () => {
        const result =
            createConnection();

        expect(
            result.connection.tokenHash,
        ).toBe(
            sha256(result.token),
        );

        expect(
            result.connection.tokenHash,
        ).not.toContain(
            "orb_local_",
        );
    });

    it("stores only installation state hash", () => {
        const result =
            createConnection();

        expect(
            result.connection.stateHash,
        ).toBe(
            sha256(result.state),
        );

        expect(
            result.connection.stateHash,
        ).not.toBe(
            result.state,
        );
    });

    it("creates expiring installation state", () => {
        const result =
            createConnection();

        const createdAt =
            Date.parse(
                result.connection.createdAt,
            );

        const expiresAt =
            Date.parse(
                result.connection.stateExpiresAt,
            );

        expect(
            expiresAt,
        ).toBeGreaterThan(
            createdAt,
        );
    });
});