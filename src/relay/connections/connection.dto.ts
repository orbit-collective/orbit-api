import type {
    GitHubConnection,
    GitHubConnectionStatus,
} from "./connection.model";

import type {
    GitHubConnectionRepository,
} from "@/relay/repositories/repository.model";

import {
    toRepositoryDto,
    type GitHubRepositoryDto,
} from "@/relay/repositories/repository.dto";

export interface GitHubConnectionDto {
    id: string;

    status: GitHubConnectionStatus;

    installationId: number | null;

    repositories: GitHubRepositoryDto[];

    createdAt: string;

    connectedAt: string | null;

    revokedAt: string | null;
}

export function toConnectionDto(
    connection: GitHubConnection,
    repositories: GitHubConnectionRepository[] = [],
): GitHubConnectionDto {
    return {
        id: connection.id,

        status: connection.status,

        installationId:
        connection.installationId,

        repositories:
            repositories.map(
                toRepositoryDto,
            ),

        createdAt:
        connection.createdAt,

        connectedAt:
        connection.connectedAt,

        revokedAt:
        connection.revokedAt,
    };
}