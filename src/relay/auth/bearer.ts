import { ApiError } from "@/shared/errors";

export function getBearerToken(
    request: Request,
): string {
    const authorization =
        request.headers.get(
            "Authorization",
        );

    if (!authorization) {
        throw new ApiError(
            "AUTHORIZATION_REQUIRED",
            "Authorization header is required.",
            401,
        );
    }

    const match =
        authorization.match(
            /^Bearer\s+(.+)$/i,
        );

    if (!match?.[1]) {
        throw new ApiError(
            "INVALID_AUTHORIZATION",
            "Authorization header must use the Bearer scheme.",
            401,
        );
    }

    const token = match[1].trim();

    if (!token) {
        throw new ApiError(
            "INVALID_AUTHORIZATION",
            "Bearer token is missing.",
            401,
        );
    }

    return token;
}