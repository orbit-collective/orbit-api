export interface GitHubUserAccessTokenResponse {
    access_token: string;

    token_type: string;

    scope: string;
}

export interface GitHubUserInstallation {
    id: number;

    account: {
        login: string;

        type:
            | "User"
            | "Organization";
    };

    repository_selection:
        | "all"
        | "selected";
}

export interface GitHubRepository {
    id: number;

    name: string;

    full_name: string;

    owner: {
        login: string;
    };

    private: boolean;
}