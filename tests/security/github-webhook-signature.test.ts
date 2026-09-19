import {
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

import {
    verifyGitHubWebhookSignature,
} from "@/security/github-webhook-signature";

describe(
    "verifyGitHubWebhookSignature",
    () => {
        beforeEach(() => {
            process.env
                .GITHUB_WEBHOOK_SECRET =
                "It's a Secret to Everybody";
        });

        it(
            "accepts valid GitHub signature",
            () => {
                const validSignature =
                    "sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17";

                expect(
                    verifyGitHubWebhookSignature(
                        "Hello, World!",
                        validSignature,
                    ),
                ).toBe(true);
            },
        );

        it(
            "rejects invalid signature",
            () => {
                expect(
                    verifyGitHubWebhookSignature(
                        "Hello, World!",
                        "sha256=invalid",
                    ),
                ).toBe(false);
            },
        );

        it(
            "rejects legacy signature format",
            () => {
                expect(
                    verifyGitHubWebhookSignature(
                        "Hello, World!",
                        "sha1=something",
                    ),
                ).toBe(false);
            },
        );
    },
);