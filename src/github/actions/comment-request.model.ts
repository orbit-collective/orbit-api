export interface CreateGitHubCommentRequest {
    eventId: string;

    pullRequestNumber: number;

    body: string;
}