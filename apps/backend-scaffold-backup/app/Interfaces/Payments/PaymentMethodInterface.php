<?php

namespace App\Interfaces\Payments;

use App\DTOs\Payments\ProcessPaymentData;
use App\Models\Payment;

interface PaymentMethodInterface
{
    public function authorize(ProcessPaymentData $data): array;

    public function capture(ProcessPaymentData $data): Payment;

    public function refund(Payment $payment, int $amount): Payment;
}
