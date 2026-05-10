<?php

namespace App\Services\Payments;

final class CashPaymentMethod extends AbstractPaymentMethod
{
    protected function provider(): string
    {
        return 'cash_drawer';
    }
}
