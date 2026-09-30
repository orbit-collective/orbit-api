import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

const githubRequest = vi.hoisted(() => vi.fn());

vi.mock("@/github/app-auth/github-api", () => ({
    githubRequest,
}));

const { fetchGitHubUserProfile } = await import(
    "@/auth/github-login/github-user.client"
);

beforeEach(() => {
    githubRequest.mockReset();
});

describe("fetchGitHubUserProfile", () => {
    it("uses the public email from GET /user when present", async () => {
        githubRequest.mockResolvedValueOnce({
            id: 123,
            login: "octocat",
            name: "The Octocat",
            email: "octocat@example.com",
        });

        const profile = await fetchGitHubUserProfile("gho_token");

        expect(profile).toEqual({
            id: "123",
            login: "octocat",
            name: "The Octocat",
            email: "octocat@example.com",
        });
        expect(githubRequest).toHaveBeenCalledOnce();
        expect(githubRequest).toHaveBeenCalledWith("/user", {
            token: "gho_token",
        });
    });

    it("falls back to the primary verified email from GET /user/emails", async () => {
        githubRequest
            .mockResolvedValueOnce({
                id: 123,
                login: "octocat",
                name: "The Octocat",
                email: null,
            })
            .mockResolvedValueOnce([
                { email: "secondary@example.com", primary: false, verified: true },
                { email: "primary@example.com", primary: true, verified: true },
            ]);

        const profile = await fetchGitHubUserProfile("gho_token");

        expect(profile.email).toBe("primary@example.com");
        expect(githubRequest).toHaveBeenCalledTimes(2);
        expect(githubRequest).toHaveBeenLastCalledWith("/user/emails", {
            token: "gho_token",
        });
    });

    it("returns a null email when no primary verified email exists", async () => {
        githubRequest
            .mockResolvedValueOnce({
                id: 123,
                login: "octocat",
                name: null,
                email: null,
            })
            .mockResolvedValueOnce([
                { email: "unverified@example.com", primary: true, verified: false },
            ]);

        const profile = await fetchGitHubUserProfile("gho_token");

        expect(profile.email).toBeNull();
    });
});
