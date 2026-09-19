import { getOrbitStore } from "@/shared/storage";

import { connectionKeys } from "./connection.keys";
import type { GitHubConnection } from "./connection.model";

interface ConnectionLookup {
    connectionId: string;
}

export class ConnectionRepository {
    public async create(
        connection: GitHubConnection,
    ): Promise<void> {
        const store = getOrbitStore();

        const connectionResult =
            await store.setJSON(
                connectionKeys.byId(
                    connection.id,
                ),
                connection,
                {
                    onlyIfNew: true,
                },
            );

        if (!connectionResult.modified) {
            throw new Error(
                `Connection ${connection.id} already exists.`,
            );
        }

        await store.setJSON(
            connectionKeys.byTokenHash(
                connection.tokenHash,
            ),
            {
                connectionId:
                connection.id,
            } satisfies ConnectionLookup,
            {
                onlyIfNew: true,
            },
        );

        await store.setJSON(
            connectionKeys.byStateHash(
                connection.stateHash,
            ),
            {
                connectionId:
                connection.id,
            } satisfies ConnectionLookup,
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
            connectionKeys.byId(
                connectionId,
            ),
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
            connectionKeys.byTokenHash(
                tokenHash,
            ),
            {
                type: "json",
                consistency: "strong",
            },
        ) as ConnectionLookup | null;

        if (!lookup) {
            return null;
        }

        return this.findById(
            lookup.connectionId,
        );
    }

    public async findByStateHash(
        stateHash: string,
    ): Promise<GitHubConnection | null> {
        const store = getOrbitStore();

        const lookup = await store.get(
            connectionKeys.byStateHash(
                stateHash,
            ),
            {
                type: "json",
                consistency: "strong",
            },
        ) as ConnectionLookup | null;

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
        ) as ConnectionLookup | null;

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
            connectionKeys.byId(
                connection.id,
            ),
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
                    connectionId:
                    connection.id,
                } satisfies ConnectionLookup,
            );
        }
    }
}