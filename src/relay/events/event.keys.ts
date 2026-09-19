export const eventKeys = {
    byId(
        connectionId: string,
        eventId: string,
    ): string {
        return `events/${connectionId}/${eventId}`;
    },

    prefix(
        connectionId: string,
    ): string {
        return `events/${connectionId}/`;
    },
};