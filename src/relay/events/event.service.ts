import {
    ApiError,
} from "@/shared/errors";

import {
    now,
} from "@/shared/time";

import {
    toEventDto,
    type GitHubRelayEventDto,
} from "./event.dto";

import {
    EventRepository,
} from "./event.repository";

export class EventService {
    public constructor(
        private readonly repository =
        new EventRepository(),
    ) {}

    public async listPending(
        connectionId: string,
    ): Promise<
        GitHubRelayEventDto[]
    > {
        const events =
            await this.repository
                .listPending(
                    connectionId,
                    50,
                );

        return events.map(
            toEventDto,
        );
    }

    public async acknowledge(
        connectionId: string,
        eventId: string,
    ): Promise<void> {
        const event =
            await this.repository
                .findById(
                    connectionId,
                    eventId,
                );

        if (!event) {
            throw new ApiError(
                "EVENT_NOT_FOUND",
                "Relay event could not be found.",
                404,
            );
        }

        if (
            Date.parse(
                event.expiresAt,
            ) <= Date.now()
        ) {
            throw new ApiError(
                "EVENT_EXPIRED",
                "Relay event has expired.",
                410,
            );
        }

        if (
            event.processedAt !==
            null
        ) {
            /*
             * ACK is deliberately idempotent.
             *
             * If Orbit Local retries the same
             * acknowledgement, we consider it
             * successful.
             */
            return;
        }

        await this.repository
            .markProcessed(
                connectionId,
                eventId,
                now(),
            );
    }
}