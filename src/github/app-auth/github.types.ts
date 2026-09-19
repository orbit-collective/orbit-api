export interface GitHubApp {
    id: number;
    slug: string;
    name: string;
    html_url: string;

    owner: {
        login: string;
    };
}

export interface GitHubInstallationAccessToken {
    token: string;

    expires_at: string;

    permissions: Record<
        string,
        string
    >;

    repository_selection:
        | "all"
        | "selected";
}