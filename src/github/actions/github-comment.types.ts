export interface GitHubIssueComment {
    id: number;

    html_url: string;

    body: string;

    user: {
        login: string;
    };
}