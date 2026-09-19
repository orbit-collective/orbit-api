import { getOrbitStore } from "@/shared/storage";

import { eventKeys } from "./event.keys";
import type { GitHubRelayEvent } from "./event.model";

export class EventRepository {
    public async create(
        event: GitHubRelayEvent,
    ): Promise<void> {
        const store = getOrbitStore();

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

        const events:
            GitHubRelayEvent[] = [];

        for (
            const blob of result.blobs
            ) {
            const event =
                await store.get(
                    blob.key,
                    {
                        type: "json",
                        consistency:
                            "strong",
                    },
                ) as
                    GitHubRelayEvent |
                    null;

            if (
                event &&
                event.processedAt ===
                null
            ) {
                events.push(
                    event,
                );
            }
        }

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
}