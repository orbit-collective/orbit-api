import {
    generateId,
} from "@/security/token";

import {
    now,
} from "@/shared/time";

import {
    ApiError,
} from "@/shared/errors";

import {
    getErrorMessage,
} from "@/shared/error-message";

import {
    ConnectionRepository,
} from "@/relay/connections/connection.repository";

import {
    EventRepository,
} from "@/relay/events/event.repository";

import type {
    GitHubRelayEvent,
} from "@/relay/events/event.model";

import {
    DeliveryRepository,
} from "./delivery.repository";

import type {
    GitHubPullRequestWebhook,
} from "./pull-request-webhook.model";

import type {
    GitHubCheckSuiteWebhook,
} from "./check-suite-webhook.model";

import type {
    GitHubPullRequestReviewWebhook,
} from "./pull-request-review-webhook.model";

import type {
    GitHubCheckStatus,
    GitHubReviewState,
    RelayEventAction,
} from "@/relay/events/event.model";

const EVENT_TTL_HOURS = 24;

const SUPPORTED_PULL_REQUEST_ACTIONS:
    RelayEventAction[] = [
    "opened",
    "reopened",
    "closed",
    "synchronize",
];

/** Maps GitHub's own check_suite status/conclusion into the three states Orbit Local stores (see event.model.ts). A suite that isn't "completed" yet is always "pending", regardless of conclusion. */
function mapCheckStatus(
    status: string,
    conclusion: string | null,
): GitHubCheckStatus {
    if (status !== "completed") {
        return "pending";
    }

    if (
        conclusion === "success" ||
        conclusion === "neutral" ||
        conclusion === "skipped"
    ) {
        return "passed";
    }

    return "failed";
}

function mapReviewState(
    state: string,
): GitHubReviewState | null {
    const normalized =
        state.toLowerCase();

    if (
        normalized === "approved" ||
        normalized === "changes_requested" ||
        normalized === "commented"
    ) {
        return normalized;
    }

    return null;
}

export interface HandleWebhookInput {
    deliveryId: string;

    event: string;

    payload:
        | GitHubPullRequestWebhook
        | GitHubCheckSuiteWebhook
        | GitHubPullRequestReviewWebhook;
}

export interface HandleWebhookResult {
    ignored: boolean;

    duplicate: boolean;

    relayEventId:
        string | null;
}

export class GitHubWebhookService {
    public constructor(
        private readonly deliveryRepository =
        new DeliveryRepository(),

        private readonly connectionRepository =
        new ConnectionRepository(),

        private readonly eventRepository =
        new EventRepository(),
    ) {}

    public async handle(
        input: HandleWebhookInput,
    ): Promise<HandleWebhookResult> {
        let delivery =
            await this.deliveryRepository
                .findById(
                    input.deliveryId,
                );

        if (
            delivery?.status ===
            "processed"
        ) {
            return {
                ignored: false,
                duplicate: true,
                relayEventId: null,
            };
        }

        if (!delivery) {
            delivery = {
                id:
                input.deliveryId,

                event:
                input.event,

                action:
                    input.payload
                        .action ??
                    null,

                status:
                    "received",

                receivedAt:
                    now(),

                processingStartedAt:
                    null,

                processedAt:
                    null,

                failedAt:
                    null,

                attempts:
                    0,

                lastError:
                    null,
            };

            const created =
                await this
                    .deliveryRepository
                    .create(
                        delivery,
                    );

            if (!created) {
                delivery =
                    await this
                        .deliveryRepository
                        .findById(
                            input
                                .deliveryId,
                        );

                if (!delivery) {
                    throw new ApiError(
                        "DELIVERY_STATE_ERROR",
                        "Webhook delivery state could not be resolved.",
                        500,
                    );
                }

                if (
                    delivery.status ===
                    "processed"
                ) {
                    return {
                        ignored:
                            false,

                        duplicate:
                            true,

                        relayEventId:
                            null,
                    };
                }
            }
        }

        delivery.status =
            "processing";

        delivery.processingStartedAt =
            now();

        delivery.attempts += 1;

        delivery.lastError =
            null;

        await this
            .deliveryRepository
            .save(
                delivery,
            );

        try {
            const result =
                await this.processWebhook(
                    input,
                );

            delivery.status =
                "processed";

            delivery.processedAt =
                now();

            delivery.failedAt =
                null;

            await this
                .deliveryRepository
                .save(
                    delivery,
                );

            return result;
        } catch (error) {
            delivery.status =
                "failed";

            delivery.failedAt =
                now();

            delivery.lastError =
                getErrorMessage(
                    error,
                );

            await this
                .deliveryRepository
                .save(
                    delivery,
                );

            throw error;
        }
    }

    private async processWebhook(
        input: HandleWebhookInput,
    ): Promise<HandleWebhookResult> {
        if (input.event === "pull_request") {
            return this.processPullRequestWebhook(
                input.deliveryId,
                input.payload as GitHubPullRequestWebhook,
            );
        }

        if (input.event === "check_suite") {
            return this.processCheckSuiteWebhook(
                input.deliveryId,
                input.payload as GitHubCheckSuiteWebhook,
            );
        }

        if (input.event === "pull_request_review") {
            return this.processPullRequestReviewWebhook(
                input.deliveryId,
                input.payload as GitHubPullRequestReviewWebhook,
            );
        }

        console.log(
            "GitHub webhook ignored: unsupported event type",
            {
                deliveryId: input.deliveryId,
                event: input.event,
            },
        );

        return ignoredResult();
    }

    private async processPullRequestWebhook(
        deliveryId: string,
        payload: GitHubPullRequestWebhook,
    ): Promise<HandleWebhookResult> {
        if (
            !SUPPORTED_PULL_REQUEST_ACTIONS.includes(
                payload.action as RelayEventAction,
            )
        ) {
            console.log(
                "GitHub webhook ignored: unsupported action",
                { deliveryId, action: payload.action ?? null },
            );

            return ignoredResult();
        }

        const resolution = await this.resolveConnection(
            deliveryId,
            payload.installation?.id,
            payload.repository.id,
        );

        if (resolution.result) return resolution.result;

        const { connection, installationId, repositoryId } = resolution;

        return this.createRelayEvent(deliveryId, connection.id, {
            id: generateId(),
            connectionId: connection.id,
            deliveryId,
            type: "pull_request",
            action: payload.action as RelayEventAction,
            installationId,
            repositoryId,
            pullRequestId: payload.pull_request.id,
            pullRequestNumber: payload.pull_request.number,
            pullRequestUrl: payload.pull_request.html_url,
            pullRequestBody: payload.pull_request.body ?? "",
            pullRequestTitle: payload.pull_request.title,
            pullRequestSourceBranch: payload.pull_request.head.ref,
            pullRequestTargetBranch: payload.pull_request.base.ref,
            pullRequestDraft: payload.pull_request.draft,
            pullRequestState: payload.pull_request.state,
            pullRequestMerged: payload.pull_request.merged,
            pullRequestMergedAt: payload.pull_request.merged_at,
            pullRequestUpdatedAt: payload.pull_request.updated_at,
            createdAt: now(),
            processedAt: null,
            expiresAt: createEventExpiry(),
        });
    }

    /**
     * Only the suite's first linked pull request is used - a suite spanning
     * several open PRs on the same commit is a rare edge case, and adding a
     * fan-out (multiple relay events for one delivery) would break the
     * existing one-event-per-delivery dedupe invariant every other event
     * type relies on for no real benefit here (see event.repository.ts).
     */
    private async processCheckSuiteWebhook(
        deliveryId: string,
        payload: GitHubCheckSuiteWebhook,
    ): Promise<HandleWebhookResult> {
        if (payload.action !== "completed" && payload.action !== "in_progress" && payload.action !== "requested" && payload.action !== "rerequested") {
            return ignoredResult();
        }

        const pullRequest = payload.check_suite.pull_requests[0];

        if (!pullRequest) {
            console.log(
                "GitHub webhook ignored: check_suite has no linked pull request",
                { deliveryId },
            );

            return ignoredResult();
        }

        const resolution = await this.resolveConnection(
            deliveryId,
            payload.installation?.id,
            payload.repository.id,
        );

        if (resolution.result) return resolution.result;

        const { connection, installationId, repositoryId } = resolution;

        return this.createRelayEvent(deliveryId, connection.id, {
            id: generateId(),
            connectionId: connection.id,
            deliveryId,
            type: "check_suite",
            action: "completed",
            installationId,
            repositoryId,
            pullRequestId: pullRequest.id,
            pullRequestNumber: pullRequest.number,
            checkStatus: mapCheckStatus(
                payload.check_suite.status,
                payload.check_suite.conclusion,
            ),
            createdAt: now(),
            processedAt: null,
            expiresAt: createEventExpiry(),
        });
    }

    private async processPullRequestReviewWebhook(
        deliveryId: string,
        payload: GitHubPullRequestReviewWebhook,
    ): Promise<HandleWebhookResult> {
        if (payload.action !== "submitted") {
            return ignoredResult();
        }

        const reviewState = mapReviewState(payload.review.state);

        if (!reviewState) {
            console.log(
                "GitHub webhook ignored: unsupported review state",
                { deliveryId, state: payload.review.state },
            );

            return ignoredResult();
        }

        const resolution = await this.resolveConnection(
            deliveryId,
            payload.installation?.id,
            payload.repository.id,
        );

        if (resolution.result) return resolution.result;

        const { connection, installationId, repositoryId } = resolution;

        return this.createRelayEvent(deliveryId, connection.id, {
            id: generateId(),
            connectionId: connection.id,
            deliveryId,
            type: "pull_request_review",
            action: "submitted",
            installationId,
            repositoryId,
            pullRequestId: payload.pull_request.id,
            pullRequestNumber: payload.pull_request.number,
            reviewState,
            reviewerLogin: payload.review.user.login,
            createdAt: now(),
            processedAt: null,
            expiresAt: createEventExpiry(),
        });
    }

    /**
     * Shared installation/repository -> connection resolution, and the
     * webhook's own missing-installation validation, used by all three
     * event-type handlers above.
     */
    private async resolveConnection(
        deliveryId: string,
        installationId: number | undefined,
        repositoryId: number,
    ): Promise<
        | { result: HandleWebhookResult }
        | { result: null; connection: NonNullable<Awaited<ReturnType<ConnectionRepository["findByRepository"]>>>; installationId: number; repositoryId: number }
    > {
        if (!installationId) {
            throw new ApiError(
                "MISSING_INSTALLATION",
                "GitHub webhook does not contain an installation.",
                400,
            );
        }

        const connection = await this.connectionRepository.findByRepository(
            installationId,
            repositoryId,
        );

        if (!connection || connection.status !== "connected") {
            console.log(
                "GitHub webhook ignored: no connected connection for this repository",
                { deliveryId, installationId, repositoryId },
            );

            return { result: ignoredResult() };
        }

        return { result: null, connection, installationId, repositoryId };
    }

    private async createRelayEvent(
        deliveryId: string,
        connectionId: string,
        relayEvent: GitHubRelayEvent,
    ): Promise<HandleWebhookResult> {
        const existing = await this.eventRepository.findByDeliveryId(
            connectionId,
            deliveryId,
        );

        if (existing) {
            return {
                ignored: false,
                duplicate: true,
                relayEventId: existing.id,
            };
        }

        await this.eventRepository.create(relayEvent);

        console.log("GitHub relay event created", {
            deliveryId,
            connectionId,
            relayEventId: relayEvent.id,
        });

        return {
            ignored: false,
            duplicate: false,
            relayEventId: relayEvent.id,
        };
    }
}

function ignoredResult(): HandleWebhookResult {
    return { ignored: true, duplicate: false, relayEventId: null };
}

function createEventExpiry(): string {
    return new Date(
        Date.now() +
        EVENT_TTL_HOURS *
        60 *
        60 *
        1000,
    ).toISOString();
}
