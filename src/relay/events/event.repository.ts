import { mapWithConcurrency } from "@/shared/concurrency";
import { getOrbitStore } from "@/shared/storage";

import { eventKeys } from "./event.keys";
import type { GitHubRelayEvent } from "./event.model";

const READ_CONCURRENCY = 16;

/** Expired events removed per listing, so one call can't run unbounded. */
const PURGE_LIMIT = 100;

export class EventRepository {
    public async create(
        event: GitHubRelayEvent,
    ): Promise<void> {
        const store =
            getOrbitStore();

        const result =
            await store.setJSON(
                eventKeys.byId(
                    event.connectionId,
                    event.id,
                ),
                event,
                {
                    onlyIfNew: true,
                },
            );

        if (!result.modified) {
            throw new Error(
                `Relay event ${event.id} already exists.`,
            );
        }

        await store.setJSON(
            eventKeys.byDelivery(
                event.connectionId,
                event.deliveryId,
            ),
            {
                eventId:
                event.id,
            },
            {
                onlyIfNew: true,
            },
        );
    }

    public async findById(
        connectionId: string,
        eventId: string,
    ): Promise<GitHubRelayEvent | null> {
        const store = getOrbitStore();

        return await store.get(
            eventKeys.byId(
                connectionId,
                eventId,
            ),
            {
                type: "json",
                consistency: "strong",
            },
        ) as GitHubRelayEvent | null;
    }

    public async listPending(
        connectionId: string,
        limit = 50,
    ): Promise<GitHubRelayEvent[]> {
        const store =
            getOrbitStore();

        const result =
            await store.list({
                prefix:
                    eventKeys.prefix(
                        connectionId,
                    ),
            });

        /*
         * Every event blob is read, so the cost of this call is the
         * number of blobs times one round trip. Reading them in
         * parallel keeps a backlog from pushing the response past the
         * caller's timeout (Orbit Local gives up after 10 seconds).
         */
        const loaded =
            await mapWithConcurrency(
                result.blobs,
                READ_CONCURRENCY,
                async blob =>
                    await store.get(
                        blob.key,
                        {
                            type: "json",
                            consistency:
                                "strong",
                        },
                    ) as
                        GitHubRelayEvent |
                        null,
            );

        const now = Date.now();
        const events:
            GitHubRelayEvent[] = [];
        const expired:
            GitHubRelayEvent[] = [];

        for (const event of loaded) {
            if (!event) {
                continue;
            }

            if (
                Date.parse(
                    event.expiresAt,
                ) <= now
            ) {
                expired.push(event);

                continue;
            }

            if (
                event.processedAt ===
                null
            ) {
                events.push(event);
            }
        }

        await this.purgeExpired(
            expired,
        );

        return events
            .sort(
                (a, b) =>
                    a.createdAt.localeCompare(
                        b.createdAt,
                    ),
            )
            .slice(
                0,
                limit,
            );
    }

    /**
     * Deletes events past their 24 hour expiry, along with their
     * delivery lookup key. Nothing else ever removes them, so without
     * this the blobs of a connection - and with them the cost of
     * listPending() - would only ever grow.
     *
     * Only expired events are removed: a processed event that has not
     * expired yet must stay, because acknowledging it again has to
     * remain a harmless no-op. Best effort and bounded per call - a
     * failed delete is simply retried on the next listing.
     */
    private async purgeExpired(
        expired: GitHubRelayEvent[],
    ): Promise<void> {
        if (expired.length === 0) {
            return;
        }

        const store =
            getOrbitStore();

        await mapWithConcurrency(
            expired.slice(
                0,
                PURGE_LIMIT,
            ),
            READ_CONCURRENCY,
            async event => {
                try {
                    await store.delete(
                        eventKeys.byId(
                            event.connectionId,
                            event.id,
                        ),
                    );

                    await store.delete(
                        eventKeys.byDelivery(
                            event.connectionId,
                            event.deliveryId,
                        ),
                    );
                } catch (error) {
                    console.warn(
                        "Failed to purge an expired relay event",
                        {
                            connectionId:
                            event.connectionId,
                            relayEventId:
                            event.id,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                        },
                    );
                }
            },
        );
    }

    public async markProcessed(
        connectionId: string,
        eventId: string,
        processedAt: string,
    ): Promise<GitHubRelayEvent | null> {
        const event = await this.findById(
            connectionId,
            eventId,
        );

        if (!event) {
            return null;
        }

        const updated: GitHubRelayEvent = {
            ...event,
            processedAt,
        };

        const store = getOrbitStore();

        await store.setJSON(
            eventKeys.byId(
                connectionId,
                eventId,
            ),
            updated,
        );

        return updated;
    }

    public async findByDeliveryId(
        connectionId: string,
        deliveryId: string,
    ): Promise<GitHubRelayEvent | null> {
        const store =
            getOrbitStore();

        const lookup =
            await store.get(
                eventKeys.byDelivery(
                    connectionId,
                    deliveryId,
                ),
                {
                    type: "json",
                    consistency:
                        "strong",
                },
            ) as {
                eventId: string;
            } | null;

        if (!lookup) {
            return null;
        }

        return this.findById(
            connectionId,
            lookup.eventId,
        );
    }
}