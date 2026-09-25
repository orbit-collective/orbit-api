import {
    GitHubInstallationService,
} from "@/github/installations/github-installation.service";

import {
    ApiError,
} from "@/shared/errors";

import {
    now,
} from "@/shared/time";

import type {
    GitHubConnection,
} from "@/relay/connections/connection.model";

import {
    ConnectionRepository,
} from "@/relay/connections/connection.repository";

import {
    RepositoryRepository,
} from "./repository.repository";

import type {
    GitHubConnectionRepository,
} from "./repository.model";

export class RepositoryService {
    public constructor(
        private readonly repositoryRepository =
        new RepositoryRepository(),

        private readonly installationService =
        new GitHubInstallationService(),

        private readonly connectionRepository =
        new ConnectionRepository(),
    ) {}

    /**
     * A connection created before multi-repository support has no
     * connection-repositories/* records yet - its single legacy
     * repositoryId/Owner/Name triple is synthesized into the same shape
     * instead, so every caller sees one consistent list regardless of when
     * the connection was made. Read-only: nothing is written back here (see
     * ensureMigrated(), used by add()/remove() instead, for the one-time
     * write-on-touch that keeps this fallback from being needed twice for
     * the same connection).
     */
    public async listForConnection(
        connection: GitHubConnection,
    ): Promise<GitHubConnectionRepository[]> {
        const repositories =
            await this.repositoryRepository
                .listForConnection(
                    connection.id,
                );

        if (repositories.length > 0) {
            return repositories;
        }

        return this.legacyRepositoryOf(
            connection,
        );
    }

    /**
     * @throws ApiError GITHUB_REPOSITORY_NOT_ALLOWED if repositoryId is not
     *                    one the installation actually grants access to.
     */
    public async add(
        connection: GitHubConnection,
        repositoryId: number,
    ): Promise<GitHubConnectionRepository> {
        if (connection.installationId === null) {
            throw new ApiError(
                "GITHUB_REPOSITORY_NOT_ALLOWED",
                "This connection has no GitHub App installation yet.",
                400,
            );
        }

        await this.ensureMigrated(
            connection,
        );

        const existing =
            await this.repositoryRepository
                .findForConnection(
                    connection.id,
                    repositoryId,
                );

        if (existing) {
            return existing;
        }

        const installationRepositories =
            await this.installationService
                .listRepositories(
                    connection.installationId,
                );

        const target =
            installationRepositories.find(
                (repository) =>
                    repository.id ===
                    repositoryId,
            );

        if (!target) {
            throw new ApiError(
                "GITHUB_REPOSITORY_NOT_ALLOWED",
                "This repository is not accessible to the connected GitHub App installation.",
                403,
            );
        }

        const record: GitHubConnectionRepository = {
            connectionId:
            connection.id,

            installationId:
            connection.installationId,

            repositoryId:
            target.id,

            owner:
            target.owner.login,

            name:
            target.name,

            addedAt: now(),
        };

        await this.repositoryRepository.create(
            record,
        );

        return record;
    }

    /**
     * Only removes the mapping - relay events already created for this
     * repository, and every PR link Orbit Local derived from them, are left
     * untouched. Future webhook events for it simply stop resolving to a
     * connection once the reverse index is gone.
     */
    public async remove(
        connection: GitHubConnection,
        repositoryId: number,
    ): Promise<void> {
        await this.ensureMigrated(
            connection,
        );

        const existing =
            await this.repositoryRepository
                .findForConnection(
                    connection.id,
                    repositoryId,
                );

        if (!existing) {
            throw new ApiError(
                "GITHUB_REPOSITORY_NOT_ALLOWED",
                "This repository is not connected to this project.",
                404,
            );
        }

        await this.repositoryRepository.delete(
            existing,
        );
    }

    private legacyRepositoryOf(
        connection: GitHubConnection,
    ): GitHubConnectionRepository[] {
        if (
            connection.installationId === null ||
            connection.repositoryId === null ||
            connection.repositoryOwner === null ||
            connection.repositoryName === null
        ) {
            return [];
        }

        return [
            {
                connectionId:
                connection.id,

                installationId:
                connection.installationId,

                repositoryId:
                connection.repositoryId,

                owner:
                connection.repositoryOwner,

                name:
                connection.repositoryName,

                addedAt:
                    connection.connectedAt ??
                    connection.createdAt,
            },
        ];
    }

    /**
     * Materializes the legacy scalar repository (if any, and if not already
     * materialized) into a real connection-repositories/* record, then
     * clears it from the connection itself - once migrated,
     * add()/remove()/listForConnection() only ever need to reason about
     * that one, real, per-repository store, never the connection's own
     * legacy fields, and a removed legacy repository stays removed instead
     * of being synthesized back in on the next read. Idempotent: a
     * connection that already has real records, or never had a legacy
     * repository, is a no-op - note this mutates the caller's connection
     * object in place (matching how ConnectionRepository.save() is used
     * elsewhere in this codebase) as well as persisting it.
     */
    private async ensureMigrated(
        connection: GitHubConnection,
    ): Promise<void> {
        const existing =
            await this.repositoryRepository
                .listForConnection(
                    connection.id,
                );

        if (existing.length > 0) {
            return;
        }

        const legacyRepositories =
            this.legacyRepositoryOf(
                connection,
            );

        if (legacyRepositories.length === 0) {
            return;
        }

        for (const legacy of legacyRepositories) {
            await this.repositoryRepository.create(
                legacy,
            );
        }

        connection.repositoryId = null;
        connection.repositoryOwner = null;
        connection.repositoryName = null;

        await this.connectionRepository.save(
            connection,
        );
    }
}
