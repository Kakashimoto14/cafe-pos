<?php

namespace App\Http\Controllers\Api\V1;

use App\DTOs\Orders\CreateOrderData;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Services\Orders\OrderService;
use Illuminate\Http\JsonResponse;

class OrderController extends Controller
{
    public function __construct(private readonly OrderService $orderService)
    {
    }

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => [],
            'meta' => ['message' => 'Order listing reserved for repository pagination'],
        ]);
    }

    public function store(StoreOrderRequest $request): JsonResponse
    {
        $order = $this->orderService->create(CreateOrderData::fromArray($request->validated()));

        return response()->json(['data' => $order], 201);
    }

    public function show(string $id): JsonResponse
    {
        return response()->json([
            'data' => ['id' => $id],
            'meta' => ['message' => 'Detailed order serializer should be added in the next phase'],
        ]);
    }
}
