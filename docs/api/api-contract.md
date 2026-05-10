# API Contract

## Versioning

All API routes are versioned under `/api/v1`.

## Response Envelope

Successful responses should use:

```json
{
  "data": {},
  "meta": {
    "request_id": "uuid"
  }
}
```

Error responses should use:

```json
{
  "message": "Validation failed.",
  "errors": {
    "field": [
      "The field is required."
    ]
  }
}
```

## Core Endpoints

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/products`
- `POST /api/v1/orders`
- `GET /api/v1/orders/{order}`
- `POST /api/v1/orders/{order}/payments`
- `GET /api/v1/inventory/items`
- `POST /api/v1/shifts/open`
- `POST /api/v1/shifts/{shift}/close`
