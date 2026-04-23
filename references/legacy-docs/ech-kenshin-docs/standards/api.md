# API Reference

ECH-Kenshin REST API — NestJS 11 on Fastify v5, port 8000.

## Live Documentation

| Format | URL |
|--------|-----|
| Swagger UI | `<BASE_URL>/docs` |
| OpenAPI JSON | `<BASE_URL>/swagger` |
| OpenAPI YAML | `<BASE_URL>/openapi.yaml` |

Local development: `http://localhost:8000/docs`

---

## Conventions

| Concern | Detail |
|---------|--------|
| Global prefix | `/api` |
| Health check | `GET /health` |
| Versioning | Not implemented (planned v2) |
| Error format | RFC 7807 Problem Details |
| Pagination | Offset-based `?page=1&limit=20` |
| Dates | ISO 8601 (`2025-04-02T10:30:00.000Z`) |
| Entity IDs | UUID v4 for domain entities, TypeID for auth entities |
| Input validation | `ZodValidationPipe` on all DTOs |

---

## Authentication

Better-Auth at `/api/auth/*`. All protected endpoints require a session cookie set by Better-Auth (httpOnly, not accessible to JS).

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/sign-up` | Register new user |
| `POST /api/auth/sign-in` | Sign in with email + password |
| `POST /api/auth/sign-out` | Invalidate session |
| `GET /api/auth/session` | Get current session |
| `POST /api/auth/refresh-session` | Refresh session token |

Organization context is derived from the session's JWT claims — no manual `organizationId` header required.

---

## Error Format — RFC 7807 Problem Details

All errors return `Content-Type: application/problem+json`.

### Error Object

```json
{
  "type": "https://api.ech-kenshin.com/problems/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "One or more fields failed validation.",
  "instance": "/api/attributes",
  "request_id": "req_01HXYZ",
  "correlation_id": "corr_01HABC",
  "trace_id": "trace_abc123def456",
  "timestamp": "2025-04-02T10:30:00.000Z",
  "errors": [
    {
      "field": "name",
      "pointer": "/name",
      "code": "too_small",
      "message": "Name must be at least 2 characters.",
      "constraints": { "minimum": 2 }
    }
  ]
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `type` | string (URI) | Machine-readable problem type URI |
| `title` | string | Human-readable problem summary |
| `status` | number | HTTP status code |
| `detail` | string | Human-readable explanation for this occurrence |
| `instance` | string | URI of the request that produced the error |
| `request_id` | string | Unique ID for this request (for support) |
| `correlation_id` | string | Cross-service correlation ID |
| `trace_id` | string | Distributed tracing ID |
| `timestamp` | string (ISO 8601) | When the error occurred |
| `errors[]` | array | Validation errors (present on 422 only) |

### Validation Error Item

| Field | Type | Description |
|-------|------|-------------|
| `field` | string | Field name |
| `pointer` | string | RFC 6901 JSON Pointer to the invalid field |
| `code` | string | Zod error code (e.g. `too_small`, `invalid_type`) |
| `message` | string | Human-readable validation message |
| `constraints` | object | Zod constraint metadata |

### Status → Type Mapping

| HTTP Status | `type` slug | `title` |
|-------------|-------------|---------|
| 400 | `bad-request` | Bad Request |
| 401 | `unauthorized` | Unauthorized |
| 403 | `forbidden` | Forbidden |
| 404 | `not-found` | Not Found |
| 409 | `conflict` | Conflict |
| 422 | `validation-failed` | Validation Failed |
| 429 | `rate-limit-exceeded` | Rate Limit Exceeded |

---

## Pagination

All list endpoints support offset-based pagination.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | `1` | Page number (1-indexed) |
| `limit` | number | `20` | Items per page |

**Response envelope:**

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 87,
    "totalPages": 5
  }
}
```

---

## Controller Conventions

All controllers use the following NestJS/Swagger decorators:

```typescript
@ApiTags('attributes')
@Controller('attributes')
export class AttributesController {

  @Get()
  @ApiOperation({ summary: 'List attributes' })
  @ApiResponse({ status: 200, type: AttributeListResponseDto })
  findAll(@Query() query: PaginationQueryDto) { ... }

  @Post()
  @ApiOperation({ summary: 'Create attribute' })
  @ApiBody({ type: CreateAttributeDto })
  @ApiResponse({ status: 201, type: AttributeResponseDto })
  @ApiResponse({ status: 422, description: 'Validation failed' })
  create(@Body() dto: CreateAttributeDto) { ... }

  @Get(':id')
  @ApiOperation({ summary: 'Get attribute by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Attribute UUID' })
  @ApiResponse({ status: 200, type: AttributeResponseDto })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id') id: string) { ... }
}
```

---

## Example: Attributes Endpoint

### GET /api/attributes

List all attributes (paginated) for the current organization.

**Request**

```
GET /api/attributes?page=1&limit=20
```

**Success Response — 200 OK**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Color",
      "code": "color",
      "type": "select",
      "isVariantLevel": true,
      "organizationId": "org_01HXYZ",
      "createdAt": "2025-03-10T08:00:00.000Z",
      "updatedAt": "2025-03-10T08:00:00.000Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655441111",
      "name": "Material",
      "code": "material",
      "type": "text",
      "isVariantLevel": false,
      "organizationId": "org_01HXYZ",
      "createdAt": "2025-03-11T09:15:00.000Z",
      "updatedAt": "2025-03-11T09:15:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1
  }
}
```

---

### POST /api/attributes

Create a new attribute.

**Request**

```
POST /api/attributes
Content-Type: application/json
```

```json
{
  "name": "Size",
  "code": "size",
  "type": "select",
  "isVariantLevel": true
}
```

**Success Response — 201 Created**

```json
{
  "id": "770e8400-e29b-41d4-a716-446655442222",
  "name": "Size",
  "code": "size",
  "type": "select",
  "isVariantLevel": true,
  "organizationId": "org_01HXYZ",
  "createdAt": "2025-04-02T10:30:00.000Z",
  "updatedAt": "2025-04-02T10:30:00.000Z"
}
```

**Error Response — 422 Validation Failed**

```
Content-Type: application/problem+json
```

```json
{
  "type": "https://api.ech-kenshin.com/problems/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "One or more fields failed validation.",
  "instance": "/api/attributes",
  "request_id": "req_01HXYZ",
  "correlation_id": "corr_01HABC",
  "trace_id": "trace_abc123def456",
  "timestamp": "2025-04-02T10:30:00.000Z",
  "errors": [
    {
      "field": "code",
      "pointer": "/code",
      "code": "invalid_string",
      "message": "Code must contain only lowercase letters, numbers, and underscores.",
      "constraints": { "pattern": "^[a-z0-9_]+$" }
    },
    {
      "field": "type",
      "pointer": "/type",
      "code": "invalid_enum_value",
      "message": "Invalid attribute type. Expected: text | select | multiselect | boolean | number | date",
      "constraints": { "options": ["text", "select", "multiselect", "boolean", "number", "date"] }
    }
  ]
}
```

---

### GET /api/attributes/:id

Get a single attribute by UUID.

**Request**

```
GET /api/attributes/550e8400-e29b-41d4-a716-446655440000
```

**Success Response — 200 OK**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Color",
  "code": "color",
  "type": "select",
  "isVariantLevel": true,
  "organizationId": "org_01HXYZ",
  "createdAt": "2025-03-10T08:00:00.000Z",
  "updatedAt": "2025-03-10T08:00:00.000Z"
}
```

**Error Response — 404 Not Found**

```
Content-Type: application/problem+json
```

```json
{
  "type": "https://api.ech-kenshin.com/problems/not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "Attribute with ID '550e8400-e29b-41d4-a716-000000000000' was not found.",
  "instance": "/api/attributes/550e8400-e29b-41d4-a716-000000000000",
  "request_id": "req_01HABC",
  "correlation_id": "corr_01HDEF",
  "trace_id": "trace_def456ghi789",
  "timestamp": "2025-04-02T10:31:00.000Z",
  "errors": []
}
```
