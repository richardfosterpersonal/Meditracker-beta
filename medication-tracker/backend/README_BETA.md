# Medication Tracker Beta
Last Updated: 2024-12-27T22:27:33+01:00

Welcome to the Medication Tracker Beta Program! We're focusing on core features to ensure medication safety and ease of use.

## Quick Start

1. **Register (Simple Process)**
   ```bash
   curl -X POST http://localhost:8000/api/v1/beta/register \
     -H "Content-Type: application/json" \
     -d '{"email": "your.email@example.com", "name": "Your Name"}'
   ```

2. **Start Using Core Features**
   - Add medications
   - Set reminders
   - Add emergency contacts

## Core Features to Test

1. **Medication Tracking (Essential)**
   - Add medications
   - Log daily intake
   - View medication list

2. **Reminders (Basic)**
   - Set medication times
   - Get simple notifications
   - Mark as taken/missed

3. **Emergency Features**
   - Add emergency contacts
   - Quick emergency access
   - Basic alerts

## Providing Feedback

We value your input! Submit feedback anytime:
```bash
curl -X POST http://localhost:8000/api/v1/beta/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "feature": "medication_tracking",
    "feedback": "Your feedback here",
    "rating": 5
  }'
```

## Beta Guidelines

1. **Keep It Simple**
   - Focus on core features
   - Use test data only
   - Report any issues

2. **What to Test**
   - Basic medication tracking
   - Reminder functionality
   - Emergency features

3. **What Not to Test**
   - Advanced analytics
   - Complex scheduling
   - Multiple users/caretakers

## Need Help?

- **Documentation**: Visit `/docs` for API details
- **Support**: beta@medicationtracker.com
- **Status**: Check `/health` endpoint

## Security Note

This is a beta version focusing on core functionality:
- Use test data only
- Basic security measures in place
- Report security concerns immediately

Thank you for helping us build a safer medication tracking system!
