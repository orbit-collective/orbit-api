import {
    describe,
    expect,
    it,
} from "vitest";

import {
    generateRelayToken,
} from "@/security/token";
import { sha256 } from "@/security/hash";

describe("relay token", () => {
    it("generates token with Orbit prefix", () => {
        const token =
            generateRelayToken();

        expect(
            token.startsWith(
                "orb_local_",
            ),
        ).toBe(true);
    });

    it("generates unique tokens", () => {
        const first =
            generateRelayToken();

        const second =
            generateRelayToken();

        expect(first).not.toBe(
            second,
        );
    });

    it("hashes token using SHA-256", () => {
        const token =
            generateRelayToken();

        const hash = sha256(token);

        expect(hash).toHaveLength(64);

        expect(hash).not.toBe(token);
    });
});