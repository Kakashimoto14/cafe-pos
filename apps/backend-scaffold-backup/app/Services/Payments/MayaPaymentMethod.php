<?php

namespace App\Services\Payments;

final class MayaPaymentMethod extends AbstractPaymentMethod
{
    protected function provider(): string
    {
        return 'maya_gateway';
    }
}
