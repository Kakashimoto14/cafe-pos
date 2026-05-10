<?php

namespace App\Services\Payments;

final class CardPaymentMethod extends AbstractPaymentMethod
{
    protected function provider(): string
    {
        return 'card_terminal';
    }
}
