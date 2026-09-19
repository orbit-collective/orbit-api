import { failure } from "./http.js";

export class ApiError extends Error {
    public readonly code: string;
    public readonly status: number;

    public constructor(
        code: string,
        message: string,
        status = 400,
    ) {
        super(message);

        this.name = "ApiError";
        this.code = code;
        this.status = status;
    }
}

export async function handleRequest(
    callback: () => Promise<Response>,
): Promise<Response> {
    try {
        return await callback();
    } catch (error) {
        if (error instanceof ApiError) {
            return failure(
                error.code,
                error.message,
                error.status,
            );
        }

        console.error("Unhandled API error:", error);

        return failure(
            "INTERNAL_SERVER_ERROR",
            "An unexpected error occurred.",
            500,
        );
    }
}