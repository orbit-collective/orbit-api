import { getOrbitStore } from "@/shared/storage";

import { connectionKeys } from "@/relay/connections/connection.keys";

import { repositoryKeys } from "./repository.keys";
import type { GitHubConnectionRepository } from "./repository.model";

interface ConnectionLookup {
    connectionId: string;
}

/**
 * A connection's repositories, stored one blob per repository so they can
 * be added/removed independently of the connection record itself and of
 * each other. connectionKeys.byRepository (installationId+repositoryId ->
 * connectionId) is the webhook-resolution reverse index - already keyed
 * per-repository, so multiple repositories per connection just means
 * writing/removing that same key once per repository instead of once per
 * connection.
 */
export class RepositoryRepository {
    public async create(
        repository: GitHubConnectionRepository,
    ): Promise<void> {
        const store = getOrbitStore();

        await store.setJSON(
            repositoryKeys.byConnection(
                repository.connectionId,
                repository.repositoryId,
            ),
            repository,
        );

        await store.setJSON(
            connectionKeys.byRepository(
                repository.installationId,
                repository.repositoryId,
            ),
            {
                connectionId:
                repository.connectionId,
            } satisfies ConnectionLookup,
        );
    }

    public async findForConnection(
        connectionId: string,
        repositoryId: number,
    ): Promise<GitHubConnectionRepository | null> {
        const store = getOrbitStore();

        return await store.get(
            repositoryKeys.byConnection(
                connectionId,
                repositoryId,
            ),
            {
                type: "json",
                consistency: "strong",
            },
        ) as GitHubConnectionRepository | null;
    }

    public async listForConnection(
        connectionId: string,
    ): Promise<GitHubConnectionRepository[]> {
        const store = getOrbitStore();

        const result = await store.list({
            prefix: repositoryKeys.prefix(
                connectionId,
            ),
        });

        const repositories: GitHubConnectionRepository[] = [];

        for (const blob of result.blobs) {
            const repository = await store.get(
                blob.key,
                {
                    type: "json",
                    consistency: "strong",
                },
            ) as GitHubConnectionRepository | null;

            if (repository) {
                repositories.push(repository);
            }
        }

        return repositories;
    }

    public async delete(
        repository: GitHubConnectionRepository,
    ): Promise<void> {
        const store = getOrbitStore();

        await store.delete(
            repositoryKeys.byConnection(
                repository.connectionId,
                repository.repositoryId,
            ),
        );

        await store.delete(
            connectionKeys.byRepository(
                repository.installationId,
                repository.repositoryId,
            ),
        );
    }
}
