import {
    describe,
    expect,
    it,
} from "vitest";

import {
    getGitHubWebhookHeaders,
} from "@/github/webhooks/webhook-headers";

describe(
    "getGitHubWebhookHeaders",
    () => {
        it(
            "returns GitHub webhook headers",
            () => {
                const request =
                    new Request(
                        "http://localhost",
                        {
                            headers: {
                                "X-GitHub-Event":
                                    "pull_request",

                                "X-GitHub-Delivery":
                                    "delivery-123",

                                "X-Hub-Signature-256":
                                    "sha256=test",
                            },
                        },
                    );

                expect(
                    getGitHubWebhookHeaders(
                        request,
                    ),
                ).toEqual({
                    event:
                        "pull_request",

                    deliveryId:
                        "delivery-123",

                    signature:
                        "sha256=test",
                });
            },
        );

        it(
            "rejects missing signature",
            () => {
                const request =
                    new Request(
                        "http://localhost",
                        {
                            headers: {
                                "X-GitHub-Event":
                                    "pull_request",

                                "X-GitHub-Delivery":
                                    "delivery-123",
                            },
                        },
                    );

                expect(() =>
                    getGitHubWebhookHeaders(
                        request,
                    ),
                ).toThrow();
            },
        );
    },
);