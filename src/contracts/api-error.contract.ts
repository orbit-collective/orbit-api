export interface ApiErrorResponse {
    success: false;

    error: {
        code: string;

        message: string;
    };
}

export interface ApiSuccessResponse<T> {
    success: true;

    data: T;
}

export type ApiResponse<T> =
    | ApiSuccessResponse<T>
    | ApiErrorResponse;