import {
    importPKCS8,
    SignJWT,
} from "jose";

import {
    getGitHubAppConfig,
} from "./github-app.config";

const JWT_ALGORITHM = "RS256";

const JWT_TTL_SECONDS = 9 * 60;

const CLOCK_SKEW_SECONDS = 60;

export async function createGitHubAppJwt():
    Promise<string> {
    const config =
        getGitHubAppConfig();

    const privateKey =
        await importPKCS8(
            config.privateKey,
            JWT_ALGORITHM,
        );

    const now =
        Math.floor(
            Date.now() / 1000,
        );

    return new SignJWT({})
        .setProtectedHeader({
            alg: JWT_ALGORITHM,
        })
        .setIssuedAt(
            now -
            CLOCK_SKEW_SECONDS,
        )
        .setExpirationTime(
            now +
            JWT_TTL_SECONDS,
        )
        .setIssuer(
            config.appId,
        )
        .sign(
            privateKey,
        );
}