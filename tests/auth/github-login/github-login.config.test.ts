import {
    afterEach,
    describe,
    expect,
    it,
} from "vitest";

import { getGitHubLoginCallbackUrl } from "@/auth/github-login/github-login.config";

const originalValue = process.env.GITHUB_LOGIN_CALLBACK_URL;

afterEach(() => {
    if (originalValue === undefined) {
        delete process.env.GITHUB_LOGIN_CALLBACK_URL;
    } else {
        process.env.GITHUB_LOGIN_CALLBACK_URL = originalValue;
    }
});

describe("getGitHubLoginCallbackUrl", () => {
    it("reads GITHUB_LOGIN_CALLBACK_URL from the environment", () => {
        process.env.GITHUB_LOGIN_CALLBACK_URL = "https://api.orbit-dev.app/v1/auth/github/callback";

        expect(getGitHubLoginCallbackUrl()).toBe(
            "https://api.orbit-dev.app/v1/auth/github/callback",
        );
    });

    it("throws when the environment variable is missing", () => {
        delete process.env.GITHUB_LOGIN_CALLBACK_URL;

        expect(() => getGitHubLoginCallbackUrl()).toThrow();
    });
});
