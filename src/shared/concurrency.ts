/**
 * Maps `items` through an async `mapper` with at most `limit` calls in
 * flight at once, keeping the results in input order.
 *
 * Netlify Blobs reads are one network round trip each, so awaiting them in
 * a loop makes a listing's latency grow linearly with the number of blobs,
 * while an unbounded Promise.all would open every request at once. A small
 * pool gets almost all of the parallelism without that.
 *
 * Rejects as soon as one call rejects, like Promise.all.
 */
export async function mapWithConcurrency<T, R>(
    items: readonly T[],
    limit: number,
    mapper: (
        item: T,
        index: number,
    ) => Promise<R>,
): Promise<R[]> {
    const results = new Array<R>(items.length);
    let next = 0;

    const worker = async (): Promise<void> => {
        while (next < items.length) {
            const index = next++;

            results[index] = await mapper(
                items[index] as T,
                index,
            );
        }
    };

    await Promise.all(
        Array.from(
            {
                length: Math.min(
                    Math.max(limit, 1),
                    items.length,
                ),
            },
            worker,
        ),
    );

    return results;
}
