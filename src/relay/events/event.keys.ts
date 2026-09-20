export const eventKeys = {
    byId(
        connectionId: string,
        eventId: string,
    ): string {
        return `events/${connectionId}/${eventId}`;
    },

    byDelivery(
        connectionId: string,
        deliveryId: string,
    ): string {
        return `event-delivery/${connectionId}/${deliveryId}`;
    },

    prefix(
        connectionId: string,
    ): string {
        return `events/${connectionId}/`;
    },
};