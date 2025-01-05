# Metrics API Documentation
*Last Updated: 2024-12-24T21:45:10+01:00*

## Critical Path Alignment
This API documentation maintains alignment with:
- Medication Safety (Critical)
- Data Security (Critical)
- Performance Monitoring (Critical)
- Validation Chain
- Single Source of Truth

## Authentication
All endpoints except `/health` require:
- JWT Bearer token
- Admin privileges
- Rate limiting compliance

## Endpoints

### 1. Collect Metric
**POST** `/api/v1/metrics/collect`

Collects a new metric with validation and evidence.

#### Critical Path Requirements
- Medication Safety: Real-time monitoring
- Data Security: HIPAA compliance
- Validation: Input validation
- Evidence: Audit trail

#### Request Body
```json
{
  "name": "string",         // Metric name
  "type": "string",         // Enum: "counter", "gauge", "histogram"
  "category": "string",     // Enum: "medication", "security", "performance"
  "value": "number",        // Metric value
  "labels": {              // Optional metric labels
    "key": "value"
  }
}
```

#### Response
```json
{
  "status": "success",
  "timestamp": "string",    // ISO 8601
  "data": {
    "evidence_id": "string",
    "validation_chain": []
  }
}
```

### 2. Query Metric
**GET** `/api/v1/metrics/query/{metric_name}`

Queries metric data with optional filters.

#### Critical Path Requirements
- Data Access Control
- HIPAA Compliance
- Evidence Collection

#### Query Parameters
- `start_time`: ISO 8601 timestamp
- `end_time`: ISO 8601 timestamp
- `labels`: JSON encoded label filters

#### Response
```json
{
  "status": "success",
  "timestamp": "string",
  "data": {
    "values": [
      {
        "value": "number",
        "timestamp": "string"
      }
    ]
  }
}
```

### 3. Metrics Summary
**GET** `/api/v1/metrics/summary`

Get summary of all metrics.

#### Critical Path Requirements
- Performance Monitoring
- Business Metrics
- Validation Chain

#### Query Parameters
- `category`: Optional metric category filter

#### Response
```json
{
  "status": "success",
  "timestamp": "string",
  "data": {
    "metric_name": {
      "latest_value": "number",
      "avg_value": "number"
    }
  }
}
```

### 4. Check Metric Alerts
**POST** `/api/v1/metrics/check-alerts`

Check all metric-based alerts.

#### Critical Path Requirements
- Medication Safety
- System Monitoring
- Evidence Collection

#### Response
```json
{
  "status": "success",
  "timestamp": "string",
  "triggered_alerts": [
    {
      "alert_name": "string",
      "metric_name": "string",
      "threshold": "number",
      "current_value": "number"
    }
  ]
}
```

### 5. Health Check
**GET** `/api/v1/metrics/health`

Service health check endpoint.

#### Critical Path Requirements
- System Health
- Availability Monitoring

#### Response
```json
{
  "status": "healthy",
  "timestamp": "string"
}
```

## Rate Limits
| Endpoint | Rate Limit |
|----------|------------|
| `/collect` | 100/minute |
| `/query` | 100/minute |
| `/summary` | 100/minute |
| `/check-alerts` | 60/minute |

## Validation Chain
1. Authentication validation
2. Input validation
3. Business logic validation
4. Evidence collection
5. Response validation

## Error Responses
All errors follow standard HTTP status codes with detailed messages:
```json
{
  "detail": "Error description",
  "error_code": "string",
  "timestamp": "string"
}
```

## Single Source of Truth
This documentation is the single source of truth for the Metrics API. All implementations must align with these specifications.

## Evidence Collection
All API operations maintain an evidence trail:
1. Request validation
2. Authentication checks
3. Operation execution
4. Response generation

## Security Requirements
1. HIPAA Compliance
2. Data Encryption
3. Access Control
4. Audit Logging
5. Rate Limiting

## Related Documentation
- [Monitoring Implementation](../validation/evidence/2024-12-24_monitoring_implementation.md)
- [Critical Path Analysis](../validation/evidence/2024-12-24_critical_path_analysis.md)
- [Validation Status](../validation/evidence/2024-12-24_validation_status.md)
