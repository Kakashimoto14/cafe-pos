<?php

namespace App\Services\Payments;

final class GCashPaymentMethod extends AbstractPaymentMethod
{
    protected function provider(): string
    {
        return 'gcash_gateway';
    }
}
