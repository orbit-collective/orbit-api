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
        const deliveryCreated =
            await this.deliveryRepository
                .create({
                    id:
                    input.deliveryId,

                    event:
                    input.event,

                    action:
                        input.payload
                            .action ??
                        null,

                    receivedAt:
                        now(),

                    processedAt:
                        null,
                });

        if (!deliveryCreated) {
            return {
                ignored:
                    false,

                duplicate:
                    true,

                relayEventId:
                    null,
            };
        }

        if (
            input.event !==
            "pull_request"
        ) {
            await this
                .deliveryRepository
                .markProcessed(
                    input.deliveryId,
                    now(),
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
            await this
                .deliveryRepository
                .markProcessed(
                    input.deliveryId,
                    now(),
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

        if (!connection) {
            /*
             * The GitHub App may receive events
             * for an installation/repository
             * that is not associated with
             * an active Orbit Local connection.
             *
             * This is not a webhook failure.
             */
            await this
                .deliveryRepository
                .markProcessed(
                    input.deliveryId,
                    now(),
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
            connection.status !==
            "connected"
        ) {
            await this
                .deliveryRepository
                .markProcessed(
                    input.deliveryId,
                    now(),
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

            pullRequestNumber:
            input.payload
                .pull_request
                .number,

            pullRequestBody:
                input.payload
                    .pull_request
                    .body ??
                "",

            createdAt:
                now(),

            processedAt:
                null,
        };

        await this
            .eventRepository
            .create(
                relayEvent,
            );

        await this
            .deliveryRepository
            .markProcessed(
                input.deliveryId,
                now(),
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