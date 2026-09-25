import type {
    GitHubConnection,
    GitHubConnectionStatus,
} from "./connection.model";

import type {
    GitHubConnectionRepository,
} from "@/relay/repositories/repository.model";

export interface GitHubConnectionDto {
    id: string;

    status: GitHubConnectionStatus;

    installationId: number | null;

    repositories: {
        id: number;
        owner: string;
        name: string;
    }[];

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
                (repository) => ({
                    id: repository.repositoryId,
                    owner: repository.owner,
                    name: repository.name,
                }),
            ),

        createdAt:
        connection.createdAt,

        connectedAt:
        connection.connectedAt,

        revokedAt:
        connection.revokedAt,
    };
}