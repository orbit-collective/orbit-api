/**
 * One GitHub repository a connection has been given access to. A connection
 * may have several of these - see repository.repository.ts. installationId
 * is duplicated from the owning connection so the webhook-resolution
 * reverse index (connectionKeys.byRepository) can be written per repository
 * without an extra read.
 */
export interface GitHubConnectionRepository {
    connectionId: string;

    installationId: number;

    repositoryId: number;

    owner: string;

    name: string;

    addedAt: string;
}
