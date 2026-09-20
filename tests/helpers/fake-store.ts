export interface FakeBlobStore {
    setJSON(
        key: string,
        value: unknown,
        options?: {
            onlyIfNew?: boolean;
        },
    ): Promise<{
        modified: boolean;
    }>;

    get(
        key: string,
        options?: unknown,
    ): Promise<unknown>;

    delete(
        key: string,
    ): Promise<void>;

    list(
        options?: {
            prefix?: string;
        },
    ): Promise<{
        blobs: {
            key: string;
        }[];
    }>;

    entries: Map<string, unknown>;
}

export function createFakeStore(
    initial: Record<string, unknown> = {},
): FakeBlobStore {
    const entries =
        new Map<string, unknown>(
            Object.entries(initial),
        );

    return {
        entries,

        async setJSON(
            key,
            value,
            options,
        ) {
            if (
                options?.onlyIfNew &&
                entries.has(key)
            ) {
                return {
                    modified: false,
                };
            }

            entries.set(
                key,
                JSON.parse(
                    JSON.stringify(
                        value,
                    ),
                ),
            );

            return {
                modified: true,
            };
        },

        async get(
            key,
        ) {
            return entries.has(key)
                ? entries.get(key)
                : null;
        },

        async delete(
            key,
        ) {
            entries.delete(key);
        },

        async list(
            options,
        ) {
            const prefix =
                options?.prefix ?? "";

            return {
                blobs: [
                    ...entries.keys(),
                ]
                    .filter(
                        key =>
                            key.startsWith(
                                prefix,
                            ),
                    )
                    .map(
                        key => ({
                            key,
                        }),
                    ),
            };
        },
    };
}
