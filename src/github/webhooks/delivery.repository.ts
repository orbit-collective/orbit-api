import { getOrbitStore } from "@/shared/storage";

import { deliveryKeys } from "./delivery.keys";
import type { GitHubWebhookDelivery } from "./delivery.model";

export class DeliveryRepository {
    public async create(
        delivery: GitHubWebhookDelivery,
    ): Promise<boolean> {
        const store = getOrbitStore();

        const result = await store.setJSON(
            deliveryKeys.byId(delivery.id),
            delivery,
            {
                onlyIfNew: true,
            },
        );

        return result.modified;
    }

    public async findById(
        deliveryId: string,
    ): Promise<GitHubWebhookDelivery | null> {
        const store = getOrbitStore();

        return await store.get(
            deliveryKeys.byId(
                deliveryId,
            ),
            {
                type: "json",
                consistency: "strong",
            },
        ) as GitHubWebhookDelivery | null;
    }

    public async markProcessed(
        deliveryId: string,
        processedAt: string,
    ): Promise<GitHubWebhookDelivery | null> {
        const delivery = await this.findById(
            deliveryId,
        );

        if (!delivery) {
            return null;
        }

        const updated: GitHubWebhookDelivery = {
            ...delivery,
            processedAt,
        };

        const store = getOrbitStore();

        await store.setJSON(
            deliveryKeys.byId(
                deliveryId,
            ),
            updated,
        );

        return updated;
    }
}