import {
    describe,
    expect,
    it,
} from "vitest";

import {
    getBearerToken,
} from "@/relay/auth/bearer";

describe("getBearerToken", () => {
    it("returns bearer token", () => {
        const request =
            new Request(
                "http://localhost",
                {
                    headers: {
                        Authorization:
                            "Bearer orb_local_test",
                    },
                },
            );

        expect(
            getBearerToken(
                request,
            ),
        ).toBe(
            "orb_local_test",
        );
    });

    it("accepts lowercase bearer scheme", () => {
        const request =
            new Request(
                "http://localhost",
                {
                    headers: {
                        Authorization:
                            "bearer orb_local_test",
                    },
                },
            );

        expect(
            getBearerToken(
                request,
            ),
        ).toBe(
            "orb_local_test",
        );
    });

    it("rejects missing authorization header", () => {
        const request =
            new Request(
                "http://localhost",
            );

        expect(() =>
            getBearerToken(
                request,
            ),
        ).toThrow(
            "Authorization header is required.",
        );
    });

    it("rejects invalid authorization scheme", () => {
        const request =
            new Request(
                "http://localhost",
                {
                    headers: {
                        Authorization:
                            "Basic something",
                    },
                },
            );

        expect(() =>
            getBearerToken(
                request,
            ),
        ).toThrow(
            "Authorization header must use the Bearer scheme.",
        );
    });
});