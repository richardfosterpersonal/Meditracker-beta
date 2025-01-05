# Medication Tracker Beta Testing Guide
Last Updated: 2025-01-02T20:12:18+01:00

## Overview
Welcome to the Medication Tracker beta testing program! This guide will help you set up and test the application. Your feedback is crucial for improving the app's functionality and user experience.

## Quick Start
1. Clone the repository
2. Set up environment variables (see below)
3. Install dependencies
4. Start the application
5. Begin testing!

## Environment Setup

### Required Environment Variables
Copy `.env.example` to `.env` and configure:

```bash
# Core Settings
BETA_MODE=true
LOG_LEVEL=debug
API_VERSION=v1

# Security
JWT_SECRET=your-secure-secret
ENCRYPTION_KEY=your-encryption-key

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/medication_tracker

# Notification Settings
NOTIFICATION_ENABLED=true
NOTIFICATION_PROVIDER=firebase
FIREBASE_CONFIG_PATH=./firebase-config.json

# Beta Testing
BETA_METRICS_ENABLED=true
BETA_ERROR_TRACKING=true
MAX_REQUESTS_PER_MINUTE=120
```

### Installation Steps

1. Backend Setup:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
python run.py
```

2. Frontend Setup:
```bash
cd frontend
npm install
npm run dev
```

## Beta Testing Features

### Currently Available for Testing
- ✅ Medication tracking and scheduling
- ✅ Push notifications
- ✅ Medication interaction checking
- ✅ Emergency contact system
- ✅ Advanced scheduling

### Known Limitations
- 🚫 Maximum 120 API requests per minute
- 🚫 Push notifications disabled during quiet hours (22:00-07:00)
- 🚫 Some advanced features may be unstable

## Error Reporting

### How to Report Issues
1. Use the in-app feedback form (preferred)
2. Submit issues through GitHub
3. For critical issues, contact beta-support@medication-tracker.com

### Required Information for Bug Reports
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Error messages
- Browser/device information

## Monitoring and Metrics
The beta version includes:
- Performance monitoring
- Error tracking
- Usage statistics
- API response times

## Security Notes
- All data is encrypted at rest
- API requests are rate-limited
- Authentication is required for all endpoints
- Sensitive data is properly sanitized

## Beta Testing Guidelines
1. Test all core features daily
2. Report any unusual behavior
3. Test edge cases when possible
4. Provide feedback on user experience
5. Test on different devices if possible

## Support
- Email: beta-support@medication-tracker.com
- Response time: Within 24 hours
- Emergency support: Available 24/7 for critical issues

## Feedback Priorities
1. Security concerns
2. Data accuracy
3. User experience
4. Performance issues
5. Feature suggestions

Thank you for participating in our beta testing program! Your feedback helps make Medication Tracker safer and more reliable for everyone.
