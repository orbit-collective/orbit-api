import {
    githubRequest,
} from "./github-api";
import {
    createGitHubAppJwt,
} from "./github-app-jwt";
import type {
    GitHubApp,
} from "./github.types";

export class GitHubAppService {
    public async getAuthenticatedApp():
        Promise<GitHubApp> {
        const jwt =
            await createGitHubAppJwt();

        return githubRequest<GitHubApp>(
            "/app",
            {
                token: jwt,
            },
        );
    }
}