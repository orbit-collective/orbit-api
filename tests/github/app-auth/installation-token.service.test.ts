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

vi.mock("@/github/app-auth/github-app-jwt", () => ({
    createGitHubAppJwt: vi.fn().mockResolvedValue("jwt"),
}));

const {
    InstallationTokenService,
    clearInstallationTokenCache,
} = await import(
    "@/github/app-auth/installation-token.service"
);

const inAnHour = () =>
    new Date(Date.now() + 60 * 60 * 1000).toISOString();

beforeEach(() => {
    githubRequest.mockReset();
    clearInstallationTokenCache();
});

describe("InstallationTokenService", () => {
    it("mints a token with the app JWT", async () => {
        githubRequest.mockResolvedValue({ token: "t1", expires_at: inAnHour() });

        const token = await new InstallationTokenService().create(5);

        expect(token.token).toBe("t1");
        expect(githubRequest).toHaveBeenCalledWith(
            "/app/installations/5/access_tokens",
            { method: "POST", token: "jwt" },
        );
    });

    it("reuses a token that is not about to expire, per installation", async () => {
        githubRequest.mockResolvedValue({ token: "t1", expires_at: inAnHour() });
        const service = new InstallationTokenService();

        await service.create(5);
        await service.create(5);
        expect(githubRequest).toHaveBeenCalledTimes(1);

        await service.create(6);
        expect(githubRequest).toHaveBeenCalledTimes(2);
    });

    it("mints a new one shortly before the old one expires", async () => {
        const soon = new Date(Date.now() + 60 * 1000).toISOString();
        githubRequest
            .mockResolvedValueOnce({ token: "old", expires_at: soon })
            .mockResolvedValueOnce({ token: "new", expires_at: inAnHour() });
        const service = new InstallationTokenService();

        await service.create(5);

        expect((await service.create(5)).token).toBe("new");
    });
});
