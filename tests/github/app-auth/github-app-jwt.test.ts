import {
    generateKeyPairSync,
} from "node:crypto";

import {
    decodeJwt,
} from "jose";

import {
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

import {
    createGitHubAppJwt,
} from "@/github/app-auth/github-app-jwt";

describe(
    "createGitHubAppJwt",
    () => {
        beforeEach(() => {
            const {
                privateKey,
            } =
                generateKeyPairSync(
                    "rsa",
                    {
                        modulusLength:
                            2048,
                    },
                );

            process.env.GITHUB_APP_ID =
                "123456";

            process.env.GITHUB_PRIVATE_KEY =
                privateKey.export({
                    format: "pem",
                    type: "pkcs1",
                }).toString();
        });

        it(
            "creates JWT for GitHub App",
            async () => {
                const token =
                    await createGitHubAppJwt();

                expect(
                    typeof token,
                ).toBe("string");

                expect(
                    token.split("."),
                ).toHaveLength(3);
            },
        );

        it(
            "uses GitHub App id as issuer",
            async () => {
                const token =
                    await createGitHubAppJwt();

                const payload =
                    decodeJwt(token);

                expect(
                    payload.iss,
                ).toBe(
                    "123456",
                );
            },
        );

        it(
            "creates short-lived JWT",
            async () => {
                const token =
                    await createGitHubAppJwt();

                const payload =
                    decodeJwt(token);

                expect(
                    payload.iat,
                ).toBeDefined();

                expect(
                    payload.exp,
                ).toBeDefined();

                const lifetime =
                    payload.exp! -
                    payload.iat!;

                expect(
                    lifetime,
                ).toBeLessThanOrEqual(
                    10 * 60 +
                    60,
                );
            },
        );
    },
);