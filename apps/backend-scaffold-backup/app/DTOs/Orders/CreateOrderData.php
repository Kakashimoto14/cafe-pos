<?php

namespace App\DTOs\Orders;

use App\Enums\OrderType;

final class CreateOrderData
{
    public function __construct(
        public readonly string $cashierId,
        public readonly OrderType $orderType,
        public readonly array $items,
        public readonly ?string $customerId = null,
        public readonly ?string $notes = null,
    ) {
    }

    public static function fromArray(array $payload): self
    {
        return new self(
            cashierId: $payload['cashier_id'],
            orderType: OrderType::from($payload['order_type']),
            items: $payload['items'],
            customerId: $payload['customer_id'] ?? null,
            notes: $payload['notes'] ?? null,
        );
    }
}
