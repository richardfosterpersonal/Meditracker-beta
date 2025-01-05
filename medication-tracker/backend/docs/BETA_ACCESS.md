# Beta Access Instructions
Last Updated: 2024-12-27T20:36:12+01:00

## Accessing the Beta Application

### Web Application
The beta version of the Medication Tracker is available at:
```
https://beta.medication-tracker.com
```

For local development and testing:
```
http://localhost:8000
```

### Mobile Applications
- iOS TestFlight Link: [Download iOS Beta](https://testflight.apple.com/join/medication-tracker-beta)
- Android Beta Link: [Download Android Beta](https://play.google.com/apps/testing/com.medication.tracker)

## Getting Started

1. **Request Beta Access**
   - Email beta@medication-tracker.com to request access
   - You'll receive a beta access key and instructions

2. **Registration**
   - Visit the beta registration page at https://beta.medication-tracker.com/register
   - Enter your email, name, and provided beta access key
   - Create your account password

3. **Installation**
   - **Web Version**: Simply visit https://beta.medication-tracker.com
   - **Mobile Apps**: Use the TestFlight/Play Store links above

4. **First Login**
   - Use your registered email and password
   - Complete the initial setup wizard
   - Configure your notification preferences

## Local Development Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-org/medication-tracker.git
   cd medication-tracker
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Environment Configuration**
   Create a `.env` file in the backend directory:
   ```
   BETA_MODE=true
   BETA_ACCESS_KEY=your-key-here
   DATABASE_URL=postgresql://user:pass@localhost:5432/medication_tracker
   JWT_SECRET_KEY=your-secret-key
   EXTERNAL_URL=http://localhost:8000
   CORS_ORIGINS=http://localhost:3000
   ```

4. **Start the Backend**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

5. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

The application will be available at:
- Backend API: http://localhost:8000
- Frontend: http://localhost:3000
- API Documentation: http://localhost:8000/docs

## Support Channels

- Technical Support: tech-support@medication-tracker.com
- Beta Program Support: beta@medication-tracker.com
- Emergency Support: +1-XXX-XXX-XXXX

## Reporting Issues

1. Use the in-app feedback button
2. Email bug reports to: bugs@medication-tracker.com
3. For critical issues, contact emergency support

## Beta Updates

- Updates are released every two weeks
- Auto-update is enabled for mobile apps
- Web version updates automatically
- You'll receive email notifications for major updates

## Security Notes

- All data is encrypted in transit and at rest
- Regular security audits are performed
- Beta testers should use test data only
- Report security concerns to security@medication-tracker.com
