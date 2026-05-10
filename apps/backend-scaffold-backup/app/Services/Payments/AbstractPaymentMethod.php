<?php

namespace App\Services\Payments;

use App\DTOs\Payments\ProcessPaymentData;
use App\Interfaces\Payments\PaymentMethodInterface;
use App\Models\Payment;

abstract class AbstractPaymentMethod implements PaymentMethodInterface
{
    abstract protected function provider(): string;

    public function authorize(ProcessPaymentData $data): array
    {
        return [
            'provider' => $this->provider(),
            'authorized' => true,
            'reference' => $data->reference,
            'metadata' => $data->metadata,
        ];
    }

    public function capture(ProcessPaymentData $data): Payment
    {
        $authorization = $this->authorize($data);

        return new Payment([
            'order_id' => $data->orderId,
            'payment_type' => $data->paymentType->value,
            'provider' => $this->provider(),
            'amount' => $data->amountTendered,
            'status' => 'captured',
            'reference' => $authorization['reference'],
            'metadata' => $authorization['metadata'],
        ]);
    }

    public function refund(Payment $payment, int $amount): Payment
    {
        $payment->status = 'refunded';
        $payment->refunded_amount = $amount;

        return $payment;
    }
}
