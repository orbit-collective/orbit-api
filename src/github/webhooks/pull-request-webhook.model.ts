export interface GitHubPullRequestWebhook {
    action: string;

    installation?: {
        id: number;
    };

    repository: {
        id: number;

        name: string;

        full_name: string;

        owner: {
            login: string;
        };
    };

    pull_request: {
        id: number;

        number: number;

        body: string | null;

        html_url: string;
    };
}