import {
    getOrbitStore,
} from "@/shared/storage";

import {
    commentKeys,
} from "./comment.keys";

import type {
    GitHubCommentRecord,
} from "./comment.model";

export class CommentRepository {
    public async create(
        record: GitHubCommentRecord,
    ): Promise<boolean> {
        const store =
            getOrbitStore();

        const result =
            await store.setJSON(
                commentKeys.byEvent(
                    record.connectionId,
                    record.eventId,
                ),
                record,
                {
                    onlyIfNew: true,
                },
            );

        return result.modified;
    }

    public async findByEvent(
        connectionId: string,
        eventId: string,
    ): Promise<
        GitHubCommentRecord | null
    > {
        const store =
            getOrbitStore();

        return await store.get(
            commentKeys.byEvent(
                connectionId,
                eventId,
            ),
            {
                type: "json",
                consistency:
                    "strong",
            },
        ) as
            GitHubCommentRecord |
            null;
    }
}