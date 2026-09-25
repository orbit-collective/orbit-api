import type {
    GitHubConnectionRepository,
} from "./repository.model";

export interface GitHubRepositoryDto {
    id: number;
    owner: string;
    name: string;
}

export function toRepositoryDto(
    repository: GitHubConnectionRepository,
): GitHubRepositoryDto {
    return {
        id: repository.repositoryId,
        owner: repository.owner,
        name: repository.name,
    };
}
