import {
    ApiError,
} from "@/shared/errors";

export interface GitHubWebhookHeaders {
    event: string;
    deliveryId: string;
    signature: string;
}

export function getGitHubWebhookHeaders(
    request: Request,
): GitHubWebhookHeaders {
    const event =
        request.headers.get(
            "X-GitHub-Event",
        );

    const deliveryId =
        request.headers.get(
            "X-GitHub-Delivery",
        );

    const signature =
        request.headers.get(
            "X-Hub-Signature-256",
        );

    if (!event) {
        throw new ApiError(
            "MISSING_GITHUB_EVENT",
            "X-GitHub-Event header is missing.",
            400,
        );
    }

    if (!deliveryId) {
        throw new ApiError(
            "MISSING_GITHUB_DELIVERY",
            "X-GitHub-Delivery header is missing.",
            400,
        );
    }

    if (!signature) {
        throw new ApiError(
            "MISSING_GITHUB_SIGNATURE",
            "X-Hub-Signature-256 header is missing.",
            401,
        );
    }

    return {
        event,
        deliveryId,
        signature,
    };
}