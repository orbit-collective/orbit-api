export type ApiSuccess<T> = {
    success: true;
    data: T;
};

export type ApiFailure = {
    success: false;
    error: {
        code: string;
        message: string;
    };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function json<T>(
    data: T,
    init: ResponseInit = {},
): Response {
    const headers = new Headers(init.headers);

    headers.set("Content-Type", "application/json; charset=utf-8");

    return new Response(JSON.stringify(data), {
        ...init,
        headers,
    });
}

export function success<T>(
    data: T,
    status = 200,
): Response {
    return json<ApiSuccess<T>>(
        {
            success: true,
            data,
        },
        {
            status,
        },
    );
}

export function failure(
    code: string,
    message: string,
    status = 400,
): Response {
    return json<ApiFailure>(
        {
            success: false,
            error: {
                code,
                message,
            },
        },
        {
            status,
        },
    );
}