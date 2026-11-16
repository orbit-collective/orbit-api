/**
 * A tiny in-memory cache with a time to live, kept per warm function
 * instance. It is a best-effort speed-up only: a cold instance starts empty
 * and nothing may depend on a value being there.
 */
export class TtlCache<T> {
    private readonly entries = new Map<
        string,
        { value: T; expiresAt: number }
    >();

    public constructor(
        private readonly now: () => number = Date.now,
    ) {}

    public get(key: string): T | undefined {
        const entry = this.entries.get(key);

        if (!entry) {
            return undefined;
        }

        if (entry.expiresAt <= this.now()) {
            this.entries.delete(key);

            return undefined;
        }

        return entry.value;
    }

    public set(
        key: string,
        value: T,
        ttlMs: number,
    ): void {
        this.entries.set(key, {
            value,
            expiresAt: this.now() + ttlMs,
        });
    }

    /** Cached value, or the result of `load` (cached for `ttlMs`). */
    public async remember(
        key: string,
        ttlMs: number,
        load: () => Promise<T>,
    ): Promise<T> {
        const cached = this.get(key);

        if (cached !== undefined) {
            return cached;
        }

        const value = await load();

        this.set(key, value, ttlMs);

        return value;
    }

    public clear(): void {
        this.entries.clear();
    }
}
