<?php

use App\DTOs\Payments\ProcessPaymentData;
use App\Enums\PaymentType;
use App\Services\Payments\CashPaymentMethod;

it('captures a cash payment through the payment abstraction', function (): void {
    $payment = (new CashPaymentMethod())->capture(
        new ProcessPaymentData(
            orderId: 'order-1',
            paymentType: PaymentType::Cash,
            amountTendered: 25000,
        )
    );

    expect($payment->provider)->toBe('cash_drawer')
        ->and($payment->status)->toBe('captured');
});
