<?php

namespace App\ValueObjects;

final class Money
{
    public function __construct(
        public readonly int $amount,
        public readonly string $currency = 'PHP',
    ) {
    }

    public static function fromDecimal(float $amount, string $currency = 'PHP'): self
    {
        return new self((int) round($amount * 100), $currency);
    }

    public function add(self $other): self
    {
        $this->assertSameCurrency($other);

        return new self($this->amount + $other->amount, $this->currency);
    }

    public function subtract(self $other): self
    {
        $this->assertSameCurrency($other);

        return new self($this->amount - $other->amount, $this->currency);
    }

    public function toDecimal(): float
    {
        return $this->amount / 100;
    }

    private function assertSameCurrency(self $other): void
    {
        if ($this->currency !== $other->currency) {
            throw new \InvalidArgumentException('Currency mismatch.');
        }
    }
}
