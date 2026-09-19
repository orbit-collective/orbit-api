export interface GitHubCommentRecord {
    id: string;

    connectionId: string;

    eventId: string;

    deliveryId: string;

    repositoryId: number;

    pullRequestNumber: number;

    githubCommentId: number;

    githubCommentUrl: string;

    createdAt: string;
}