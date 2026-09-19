import type {
    Context,
} from "@netlify/functions";

import {
    GitHubWebhookService,
} from "@/github/webhooks/github-webhook.service";

import {
    getGitHubWebhookHeaders,
} from "@/github/webhooks/webhook-headers";

import type {
    GitHubPullRequestWebhook,
} from "@/github/webhooks/pull-request-webhook.model";

import {
    verifyGitHubWebhookSignature,
} from "@/security/github-webhook-signature";

import {
    ApiError,
    handleRequest,
} from "@/shared/errors";

import {
    success,
} from "@/shared/http";

export default async function handler(
    request: Request,
    _context: Context,
): Promise<Response> {
    return handleRequest(
        async () => {
            if (
                request.method !==
                "POST"
            ) {
                return new Response(
                    null,
                    {
                        status: 405,

                        headers: {
                            Allow: "POST",
                        },
                    },
                );
            }

            const headers =
                getGitHubWebhookHeaders(
                    request,
                );

            /*
             * IMPORTANT:
             *
             * Signature validation must use
             * the untouched raw request body.
             */
            const rawBody =
                await request.text();

            const validSignature =
                verifyGitHubWebhookSignature(
                    rawBody,
                    headers.signature,
                );

            if (!validSignature) {
                throw new ApiError(
                    "INVALID_GITHUB_SIGNATURE",
                    "GitHub webhook signature is invalid.",
                    401,
                );
            }

            let payload:
                GitHubPullRequestWebhook;

            try {
                payload =
                    JSON.parse(
                        rawBody,
                    ) as
                        GitHubPullRequestWebhook;
            } catch {
                throw new ApiError(
                    "INVALID_WEBHOOK_PAYLOAD",
                    "GitHub webhook payload is not valid JSON.",
                    400,
                );
            }

            const service =
                new GitHubWebhookService();

            const result =
                await service.handle({
                    event:
                    headers.event,

                    deliveryId:
                    headers.deliveryId,

                    payload,
                });

            return success(
                result,
            );
        },
    );
}