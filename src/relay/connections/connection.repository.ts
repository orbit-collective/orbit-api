import { getOrbitStore } from "@/shared/storage";

import { connectionKeys } from "./connection.keys";
import type { GitHubConnection } from "./connection.model";

export class ConnectionRepository {
    public async create(
        connection: GitHubConnection,
    ): Promise<void> {
        const store = getOrbitStore();

        await store.setJSON(
            connectionKeys.byId(connection.id),
            connection,
            {
                onlyIfNew: true,
            },
        );

        await store.setJSON(
            connectionKeys.byTokenHash(connection.tokenHash),
            {
                connectionId: connection.id,
            },
            {
                onlyIfNew: true,
            },
        );
    }

    public async findById(
        connectionId: string,
    ): Promise<GitHubConnection | null> {
        const store = getOrbitStore();

        return await store.get(
            connectionKeys.byId(connectionId),
            {
                type: "json",
                consistency: "strong",
            },
        ) as GitHubConnection | null;
    }

    public async findByTokenHash(
        tokenHash: string,
    ): Promise<GitHubConnection | null> {
        const store = getOrbitStore();

        const lookup = await store.get(
            connectionKeys.byTokenHash(tokenHash),
            {
                type: "json",
                consistency: "strong",
            },
        ) as {
            connectionId: string;
        } | null;

        if (!lookup) {
            return null;
        }

        return this.findById(
            lookup.connectionId,
        );
    }

    public async findByRepository(
        installationId: number,
        repositoryId: number,
    ): Promise<GitHubConnection | null> {
        const store = getOrbitStore();

        const lookup = await store.get(
            connectionKeys.byRepository(
                installationId,
                repositoryId,
            ),
            {
                type: "json",
                consistency: "strong",
            },
        ) as {
            connectionId: string;
        } | null;

        if (!lookup) {
            return null;
        }

        return this.findById(
            lookup.connectionId,
        );
    }

    public async save(
        connection: GitHubConnection,
    ): Promise<void> {
        const store = getOrbitStore();

        await store.setJSON(
            connectionKeys.byId(connection.id),
            connection,
        );

        if (
            connection.installationId !== null &&
            connection.repositoryId !== null
        ) {
            await store.setJSON(
                connectionKeys.byRepository(
                    connection.installationId,
                    connection.repositoryId,
                ),
                {
                    connectionId: connection.id,
                },
            );
        }
    }
}