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

        title: string;

        body: string | null;

        html_url: string;

        draft: boolean;

        state: string;

        merged: boolean;

        merged_at: string | null;

        updated_at: string;

        head: {
            ref: string;
        };

        base: {
            ref: string;
        };
    };
}