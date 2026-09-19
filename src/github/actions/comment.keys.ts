export const commentKeys = {
    byEvent(
        connectionId: string,
        eventId: string,
    ): string {
        return `comments/${connectionId}/${eventId}`;
    },
};