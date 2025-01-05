# Medication Tracker API Documentation

## Schedule Adjustment Service

### Check Conflicts
Checks for conflicts in medication schedules.

**Endpoint:** `POST /api/schedule/check-conflicts`

**Request Body:**
```json
{
  "medication_id": "string",
  "proposed_time": "string (ISO 8601)",
  "existing_schedules": [
    {
      "medication_id": "string",
      "name": "string",
      "start_time": "string (ISO 8601)",
      "interval_hours": "number",
      "priority": "number (1-5)"
    }
  ]
}
```

**Response:**
```json
{
  "conflicts": [
    {
      "medication1": "string",
      "medication2": "string",
      "time": "string (ISO 8601)",
      "type": "string (time_proximity | interval_overlap | meal_conflict)",
      "suggestions": [
        {
          "type": "string (time_shift | interval_adjustment | meal_offset_adjustment | meal_change)",
          "description": "string",
          "reason": "string",
          "original_time": "string (ISO 8601, optional)",
          "suggested_time": "string (ISO 8601, optional)",
          "original_interval": "number (optional)",
          "suggested_interval": "number (optional)",
          "original_offset": "number (optional)",
          "suggested_offset": "number (optional)",
          "original_meal": "string (optional)",
          "suggested_meal": "string (optional)"
        }
      ]
    }
  ]
}
```

**Error Responses:**
- 400 Bad Request: Invalid input parameters
- 404 Not Found: Medication not found
- 500 Internal Server Error: Server processing error

### Apply Schedule Adjustment
Applies a suggested schedule adjustment.

**Endpoint:** `POST /api/schedule/adjust`

**Request Body:**
```json
{
  "medication_id": "string",
  "adjustment": {
    "type": "string",
    "new_time": "string (ISO 8601, optional)",
    "new_interval": "number (optional)",
    "new_meal_offset": "number (optional)",
    "new_meal": "string (optional)"
  }
}
```

**Response:**
```json
{
  "success": true,
  "adjusted_schedule": {
    "medication_id": "string",
    "new_time": "string (ISO 8601)",
    "new_interval": "number",
    "new_meal_offset": "number",
    "new_meal": "string"
  }
}
```

**Error Responses:**
- 400 Bad Request: Invalid adjustment parameters
- 404 Not Found: Medication not found
- 409 Conflict: Adjustment creates new conflicts
- 500 Internal Server Error: Server processing error

## Error Handling

All API endpoints follow this error response format:
```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": "object (optional)"
  }
}
```

Common error codes:
- `INVALID_INPUT`: Request parameters are invalid
- `NOT_FOUND`: Requested resource not found
- `CONFLICT`: Operation would create conflicts
- `INTERNAL_ERROR`: Server processing error

## Rate Limiting

- Rate limit: 100 requests per minute per IP
- Rate limit headers included in response:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## Performance Considerations

- Maximum schedule check: 1000 medications
- Response time targets:
  - Conflict check: < 2ms per medication
  - Suggestion generation: < 5ms per conflict
  - Schedule adjustment: < 100ms total

## Best Practices

1. Always include error handling for all API calls
2. Use appropriate timeout values (recommended: 5s)
3. Implement exponential backoff for retries
4. Cache frequently accessed schedules
5. Batch schedule checks when possible
