<?php

namespace App\Services\Payments;

use App\Enums\PaymentType;
use App\Interfaces\Payments\PaymentMethodInterface;

final class PaymentManager
{
    public function __construct(
        private readonly CashPaymentMethod $cashPaymentMethod,
        private readonly CardPaymentMethod $cardPaymentMethod,
        private readonly GCashPaymentMethod $gCashPaymentMethod,
        private readonly MayaPaymentMethod $mayaPaymentMethod,
    ) {
    }

    public function driver(PaymentType $type): PaymentMethodInterface
    {
        return match ($type) {
            PaymentType::Cash => $this->cashPaymentMethod,
            PaymentType::Card => $this->cardPaymentMethod,
            PaymentType::GCash => $this->gCashPaymentMethod,
            PaymentType::Maya => $this->mayaPaymentMethod,
            PaymentType::Qr => $this->mayaPaymentMethod,
        };
    }
}
