# Schedule API Documentation
Last Updated: 2024-12-25T20:28:37+01:00
Status: BETA
Reference: ../validation/critical_path/CRITICAL_PATH_STATUS.md

## Endpoints

### Create Schedule
```markdown
POST /schedules
Critical Path: Schedule Creation

Request:
{
    "medication_id": int,
    "user_id": int,
    "time": "HH:MM"
}

Validation:
✓ Medication exists
✓ User authorized
✓ Time format valid
✓ No conflicts

Response (201):
{
    "id": int,
    "medication_id": int,
    "user_id": int,
    "time": "HH:MM",
    "is_active": bool,
    "created_at": datetime,
    "updated_at": datetime,
    "last_taken_at": datetime|null
}
```

### Get Schedule
```markdown
GET /schedules/{schedule_id}
Critical Path: Data Safety

Validation:
✓ Schedule exists
✓ User authorized

Response (200):
{
    "id": int,
    "medication_id": int,
    "user_id": int,
    "time": "HH:MM",
    "is_active": bool,
    "created_at": datetime,
    "updated_at": datetime,
    "last_taken_at": datetime|null
}
```

### Update Schedule
```markdown
PUT /schedules/{schedule_id}
Critical Path: Schedule Safety

Request:
{
    "time": "HH:MM",
    "is_active": bool
}

Validation:
✓ Schedule exists
✓ User authorized
✓ Time format valid
✓ No conflicts

Response (200):
{
    "id": int,
    "medication_id": int,
    "user_id": int,
    "time": "HH:MM",
    "is_active": bool,
    "created_at": datetime,
    "updated_at": datetime,
    "last_taken_at": datetime|null
}
```

### Delete Schedule
```markdown
DELETE /schedules/{schedule_id}
Critical Path: Data Safety

Validation:
✓ Schedule exists
✓ User authorized

Response (200):
{
    "success": true
}
```

### List Schedules
```markdown
GET /schedules?user_id={user_id}
Critical Path: Data Safety

Validation:
✓ User authorized
✓ Valid user_id

Response (200):
[
    {
        "id": int,
        "medication_id": int,
        "user_id": int,
        "time": "HH:MM",
        "is_active": bool,
        "created_at": datetime,
        "updated_at": datetime,
        "last_taken_at": datetime|null
    }
]
```

### Record Medication Taken
```markdown
POST /schedules/{schedule_id}/taken
Critical Path: User Safety

Validation:
✓ Schedule exists
✓ User authorized
✓ Not already taken

Response (200):
{
    "id": int,
    "medication_id": int,
    "user_id": int,
    "time": "HH:MM",
    "is_active": bool,
    "created_at": datetime,
    "updated_at": datetime,
    "last_taken_at": datetime
}
```

### Check Schedule Conflicts
```markdown
GET /schedules/conflicts?user_id={user_id}&time={HH:MM}
Critical Path: Schedule Safety

Validation:
✓ User authorized
✓ Valid time format
✓ Valid user_id

Response (200):
{
    "has_conflict": bool
}
```

## Error Responses

### Validation Error (400)
```markdown
{
    "error": "Error description"
}
```

### Not Found Error (404)
```markdown
{
    "error": "Schedule not found"
}
```

### Server Error (500)
```markdown
{
    "error": "Internal server error"
}
```

## Critical Path Integration

### 1. Data Safety
```markdown
Implemented:
✓ Input validation
✓ Authorization checks
✓ Data consistency
```

### 2. User Safety
```markdown
Implemented:
✓ Time validation
✓ Conflict prevention
✓ Medication tracking
```

### 3. System Safety
```markdown
Implemented:
✓ Error handling
✓ Logging
✓ Transaction safety
```

This API documentation maintains alignment with our critical path and validation chain.
