<?php

namespace App\Enums;

enum PaymentType: string
{
    case Cash = 'cash';
    case Card = 'card';
    case GCash = 'gcash';
    case Maya = 'maya';
    case Qr = 'qr';
}
