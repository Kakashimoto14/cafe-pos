<?php

namespace App\DTOs\Payments;

use App\Enums\PaymentType;

final class ProcessPaymentData
{
    public function __construct(
        public readonly string $orderId,
        public readonly PaymentType $paymentType,
        public readonly int $amountTendered,
        public readonly ?string $reference = null,
        public readonly array $metadata = [],
    ) {
    }

    public static function fromArray(array $payload): self
    {
        return new self(
            orderId: $payload['order_id'],
            paymentType: PaymentType::from($payload['payment_type']),
            amountTendered: (int) $payload['amount_tendered'],
            reference: $payload['reference'] ?? null,
            metadata: $payload['metadata'] ?? [],
        );
    }
}
