import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

vi.mock("@/github/app-auth/github-app.config", () => ({
    getGitHubAppConfig: () => ({
        clientId: "client-id",
        clientSecret: "client-secret",
        callbackUrl: "https://api.orbit-dev.app/v1/github/callback",
    }),
}));

vi.mock("@/auth/github-login/github-login.config", () => ({
    getGitHubLoginCallbackUrl: () =>
        "https://api.orbit-dev.app/v1/auth/github/callback",
}));

vi.mock("@/auth/github-login/github-user.client", () => ({
    fetchGitHubUserProfile: vi.fn(),
}));

const {
    GitHubLoginService,
} = await import("@/auth/github-login/github-login.service");

const {
    fetchGitHubUserProfile,
} = await import("@/auth/github-login/github-user.client");

const {
    ApiError,
} = await import("@/shared/errors");

let loginStateRepository: {
    create: ReturnType<typeof vi.fn>;
    findByStateHash: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
};

let exchangeTokenRepository: {
    create: ReturnType<typeof vi.fn>;
    consume: ReturnType<typeof vi.fn>;
};

let oauthService: {
    exchangeCode: ReturnType<typeof vi.fn>;
};

function createService() {
    return new GitHubLoginService(
        loginStateRepository as never,
        exchangeTokenRepository as never,
        oauthService as never,
    );
}

beforeEach(() => {
    loginStateRepository = {
        create: vi.fn().mockResolvedValue(undefined),
        findByStateHash: vi.fn(),
        remove: vi.fn().mockResolvedValue(undefined),
    };

    exchangeTokenRepository = {
        create: vi.fn().mockResolvedValue(undefined),
        consume: vi.fn(),
    };

    oauthService = {
        exchangeCode: vi.fn().mockResolvedValue("gho_token"),
    };

    vi.mocked(fetchGitHubUserProfile).mockReset();
});

describe("GitHubLoginService.start", () => {
    it("stores a pending login state and returns GitHub's authorize URL", async () => {
        const service = createService();

        const { url } = await service.start(
            "https://orbit.customer.test/auth/github/callback?state=local-state",
        );

        expect(loginStateRepository.create).toHaveBeenCalledOnce();
        const [, storedState] = loginStateRepository.create.mock.calls[0]!;
        expect(storedState.returnTo).toBe(
            "https://orbit.customer.test/auth/github/callback?state=local-state",
        );

        const parsed = new URL(url);
        expect(parsed.origin + parsed.pathname).toBe(
            "https://github.com/login/oauth/authorize",
        );
        expect(parsed.searchParams.get("client_id")).toBe("client-id");
        expect(parsed.searchParams.get("scope")).toBe("user:email");
        expect(parsed.searchParams.get("redirect_uri")).toBe(
            "https://api.orbit-dev.app/v1/auth/github/callback",
        );
        expect(parsed.searchParams.get("state")).toBeTruthy();
    });
});

describe("GitHubLoginService.callback", () => {
    it("redirects back with an exchange_token on success", async () => {
        loginStateRepository.findByStateHash.mockResolvedValue({
            returnTo: "https://orbit.customer.test/auth/github/callback?state=local-state",
            createdAt: "2026-09-30T00:00:00.000Z",
            expiresAt: "2099-01-01T00:00:00.000Z",
        });

        vi.mocked(fetchGitHubUserProfile).mockResolvedValue({
            id: "123",
            login: "octocat",
            name: "The Octocat",
            email: "octocat@example.com",
        });

        const service = createService();

        const { redirectUrl } = await service.callback("a-code", "a-state");

        expect(oauthService.exchangeCode).toHaveBeenCalledWith(
            "a-code",
            "https://api.orbit-dev.app/v1/auth/github/callback",
        );
        expect(loginStateRepository.remove).toHaveBeenCalledOnce();
        expect(exchangeTokenRepository.create).toHaveBeenCalledOnce();

        const parsed = new URL(redirectUrl);
        expect(parsed.searchParams.get("state")).toBe("local-state");
        expect(parsed.searchParams.get("exchange_token")).toBeTruthy();
    });

    it("throws when the login state is unknown", async () => {
        loginStateRepository.findByStateHash.mockResolvedValue(null);

        const service = createService();

        await expect(
            service.callback("a-code", "unknown-state"),
        ).rejects.toThrow(ApiError);
    });

    it("redirects back with an error when the login state expired", async () => {
        loginStateRepository.findByStateHash.mockResolvedValue({
            returnTo: "https://orbit.customer.test/auth/github/callback",
            createdAt: "2026-09-30T00:00:00.000Z",
            expiresAt: "2020-01-01T00:00:00.000Z",
        });

        const service = createService();

        const { redirectUrl } = await service.callback("a-code", "a-state");

        expect(new URL(redirectUrl).searchParams.get("error")).toBeTruthy();
        expect(oauthService.exchangeCode).not.toHaveBeenCalled();
    });

    it("redirects back with an error when GitHub rejects the code", async () => {
        loginStateRepository.findByStateHash.mockResolvedValue({
            returnTo: "https://orbit.customer.test/auth/github/callback",
            createdAt: "2026-09-30T00:00:00.000Z",
            expiresAt: "2099-01-01T00:00:00.000Z",
        });

        oauthService.exchangeCode.mockRejectedValue(new Error("denied"));

        const service = createService();

        const { redirectUrl } = await service.callback("a-code", "a-state");

        expect(new URL(redirectUrl).searchParams.get("error")).toBeTruthy();
    });
});

describe("GitHubLoginService.resolve", () => {
    it("returns the identity carried by a valid token", async () => {
        exchangeTokenRepository.consume.mockResolvedValue({
            githubId: "123",
            githubUsername: "octocat",
            email: "octocat@example.com",
            name: "The Octocat",
            createdAt: "2026-09-30T00:00:00.000Z",
            expiresAt: "2099-01-01T00:00:00.000Z",
        });

        const service = createService();

        const identity = await service.resolve("a-token");

        expect(identity).toEqual({
            githubId: "123",
            githubUsername: "octocat",
            email: "octocat@example.com",
            name: "The Octocat",
        });
    });

    it("throws when the token is unknown or already used", async () => {
        exchangeTokenRepository.consume.mockResolvedValue(null);

        const service = createService();

        await expect(service.resolve("missing")).rejects.toThrow(ApiError);
    });

    it("throws when the token has expired", async () => {
        exchangeTokenRepository.consume.mockResolvedValue({
            githubId: "123",
            githubUsername: "octocat",
            email: null,
            name: null,
            createdAt: "2026-09-30T00:00:00.000Z",
            expiresAt: "2020-01-01T00:00:00.000Z",
        });

        const service = createService();

        await expect(service.resolve("a-token")).rejects.toThrow(ApiError);
    });
});
