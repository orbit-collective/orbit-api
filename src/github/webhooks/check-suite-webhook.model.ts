export interface GitHubCheckSuiteWebhook {
    action: string;

    installation?: {
        id: number;
    };

    repository: {
        id: number;
    };

    check_suite: {
        status: string;

        conclusion: string | null;

        pull_requests: Array<{
            id: number;

            number: number;
        }>;
    };
}
