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

const EVENT_TTL_HOURS = 24;

export interface HandleWebhookInput {
    deliveryId: string;

    event: string;

    payload:
        GitHubPullRequestWebhook;
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
        if (
            input.event !==
            "pull_request"
        ) {
            console.log(
                "GitHub webhook ignored: unsupported event type",
                {
                    deliveryId: input.deliveryId,
                    event: input.event,
                },
            );

            return {
                ignored:
                    true,

                duplicate:
                    false,

                relayEventId:
                    null,
            };
        }

        if (
            input.payload.action !==
            "opened"
        ) {
            console.log(
                "GitHub webhook ignored: unsupported action",
                {
                    deliveryId: input.deliveryId,
                    action: input.payload.action ?? null,
                },
            );

            return {
                ignored:
                    true,

                duplicate:
                    false,

                relayEventId:
                    null,
            };
        }

        const installationId =
            input.payload
                .installation
                ?.id;

        if (!installationId) {
            throw new ApiError(
                "MISSING_INSTALLATION",
                "GitHub webhook does not contain an installation.",
                400,
            );
        }

        const repositoryId =
            input.payload
                .repository
                .id;

        const connection =
            await this
                .connectionRepository
                .findByRepository(
                    installationId,
                    repositoryId,
                );

        if (
            !connection ||
            connection.status !==
            "connected"
        ) {
            console.log(
                "GitHub webhook ignored: no connected connection for this repository",
                {
                    deliveryId: input.deliveryId,
                    installationId,
                    repositoryId,
                },
            );

            return {
                ignored:
                    true,

                duplicate:
                    false,

                relayEventId:
                    null,
            };
        }

        const existing =
            await this
                .eventRepository
                .findByDeliveryId(
                    connection.id,
                    input.deliveryId,
                );

        if (existing) {
            return {
                ignored:
                    false,

                duplicate:
                    true,

                relayEventId:
                existing.id,
            };
        }

        const relayEvent:
            GitHubRelayEvent = {
            id:
                generateId(),

            connectionId:
            connection.id,

            deliveryId:
            input.deliveryId,

            type:
                "pull_request",

            action:
                "opened",

            installationId,

            repositoryId,

            pullRequestId:
            input.payload
                .pull_request
                .id,

            pullRequestNumber:
            input.payload
                .pull_request
                .number,

            pullRequestUrl:
            input.payload
                .pull_request
                .html_url,

            pullRequestBody:
                input.payload
                    .pull_request
                    .body ??
                "",

            createdAt:
                now(),

            processedAt:
                null,

            expiresAt: createEventExpiry(),
        };

        await this
            .eventRepository
            .create(
                relayEvent,
            );

        console.log(
            "GitHub relay event created",
            {
                deliveryId: input.deliveryId,
                connectionId: connection.id,
                relayEventId: relayEvent.id,
            },
        );

        return {
            ignored:
                false,

            duplicate:
                false,

            relayEventId:
            relayEvent.id,
        };
    }
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