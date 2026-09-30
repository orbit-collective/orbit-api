import { githubRequest } from "@/github/app-auth/github-api";

interface GitHubUserResponse {
    id: number;
    login: string;
    name: string | null;
    email: string | null;
}

interface GitHubUserEmailResponse {
    email: string;
    primary: boolean;
    verified: boolean;
}

export interface GitHubUserProfile {
    id: string;
    login: string;
    name: string | null;
    email: string | null;
}

/**
 * Resolves the authorizing user's public profile plus their primary verified
 * email - GitHub only includes `email` on GET /user when it's public, so a
 * user with a private email (the common case) needs the separate
 * /user/emails call, which the `user:email` scope grants read access to.
 */
export async function fetchGitHubUserProfile(
    accessToken: string,
): Promise<GitHubUserProfile> {
    const user = await githubRequest<GitHubUserResponse>(
        "/user",
        {
            token: accessToken,
        },
    );

    let email = user.email;

    if (!email) {
        const emails = await githubRequest<GitHubUserEmailResponse[]>(
            "/user/emails",
            {
                token: accessToken,
            },
        );

        const primaryEmail = emails.find(
            (candidate) => candidate.primary && candidate.verified,
        );

        email = primaryEmail?.email ?? null;
    }

    return {
        id: String(user.id),
        login: user.login,
        name: user.name,
        email,
    };
}
