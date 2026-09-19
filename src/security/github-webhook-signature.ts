import {
    createHmac,
    timingSafeEqual,
} from "node:crypto";

import {
    env,
} from "@/shared/env";

export function verifyGitHubWebhookSignature(
    payload: string,
    signatureHeader: string,
): boolean {
    const secret =
        env(
            "GITHUB_WEBHOOK_SECRET",
        );

    if (
        !signatureHeader.startsWith(
            "sha256=",
        )
    ) {
        return false;
    }

    const expected =
        `sha256=${
            createHmac(
                "sha256",
                secret,
            )
                .update(
                    payload,
                    "utf8",
                )
                .digest(
                    "hex",
                )
        }`;

    const expectedBuffer =
        Buffer.from(
            expected,
            "utf8",
        );

    const actualBuffer =
        Buffer.from(
            signatureHeader,
            "utf8",
        );

    if (
        expectedBuffer.length !==
        actualBuffer.length
    ) {
        return false;
    }

    return timingSafeEqual(
        expectedBuffer,
        actualBuffer,
    );
}