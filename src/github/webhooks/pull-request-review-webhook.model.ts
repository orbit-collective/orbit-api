export interface GitHubPullRequestReviewWebhook {
    action: string;

    installation?: {
        id: number;
    };

    repository: {
        id: number;
    };

    pull_request: {
        id: number;

        number: number;
    };

    review: {
        state: string;

        user: {
            login: string;
        };
    };
}
