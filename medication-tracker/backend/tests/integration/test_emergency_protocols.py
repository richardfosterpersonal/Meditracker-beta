import pytest
from datetime import datetime, timedelta
import pytz
from app.services.emergency_service import EmergencyService
from app.services.notification_service import NotificationService
from app.models.user import User
from app.models.medication import Medication
from app.models.notification import Notification

@pytest.mark.critical
class TestEmergencyProtocols:
    @pytest.fixture
    def emergency_service(self, session):
        """Create emergency service instance"""
        notification_service = NotificationService()
        return EmergencyService(notification_service)

    @pytest.fixture
    def test_user(self, session):
        """Create test user with emergency contacts"""
        user = User(
            email="test@example.com",
            name="Test User",
            phone="+1234567890"
        )
        user.emergency_contacts = [
            {
                "name": "Emergency Contact",
                "relationship": "Family",
                "phone": "+0987654321",
                "email": "emergency@example.com",
                "notify_on": ["missed_dose", "emergency"]
            }
        ]
        session.add(user)
        session.commit()
        return user

    @pytest.fixture
    def critical_medication(self, session, test_user):
        """Create critical medication"""
        med = Medication(
            name="Warfarin",
            strength="5mg",
            form="tablet",
            user_id=test_user.id,
            is_critical=True,
            schedule={
                "type": "fixed_time",
                "times": ["09:00", "21:00"],
                "max_delay": 60  # minutes
            }
        )
        session.add(med)
        session.commit()
        return med

    @pytest.mark.critical
    def test_missed_critical_dose(self, emergency_service, test_user, critical_medication):
        """Test emergency protocol activation for missed critical dose"""
        # Simulate missed dose (2 hours late)
        current_time = datetime.now(pytz.UTC)
        scheduled_time = current_time - timedelta(hours=2)
        
        # Trigger emergency protocol
        response = emergency_service.handle_missed_dose(
            user_id=test_user.id,
            medication_id=critical_medication.id,
            scheduled_time=scheduled_time,
            current_time=current_time
        )
        
        assert response["status"] == "emergency_activated"
        assert response["notifications_sent"] == True
        assert len(response["contacted_numbers"]) > 0

    @pytest.mark.critical
    def test_emergency_contact_notification(self, emergency_service, test_user, critical_medication):
        """Test emergency contact notification"""
        # Trigger emergency notification
        notifications = emergency_service.notify_emergency_contacts(
            user_id=test_user.id,
            medication_id=critical_medication.id,
            reason="missed_critical_dose"
        )
        
        assert len(notifications) > 0
        assert all(n.status == "sent" for n in notifications)
        assert any(n.method == "sms" for n in notifications)
        assert any(n.method == "email" for n in notifications)

    @pytest.mark.critical
    def test_healthcare_provider_alert(self, emergency_service, test_user, critical_medication, session):
        """Test healthcare provider notification"""
        # Add healthcare provider
        test_user.healthcare_providers = [{
            "name": "Dr. Smith",
            "phone": "+1122334455",
            "email": "dr.smith@hospital.com",
            "notify_on": ["emergency"]
        }]
        session.commit()
        
        # Trigger provider notification
        response = emergency_service.notify_healthcare_providers(
            user_id=test_user.id,
            medication_id=critical_medication.id,
            reason="missed_critical_dose"
        )
        
        assert response["status"] == "notified"
        assert len(response["notified_providers"]) > 0

    @pytest.mark.critical
    def test_emergency_access_activation(self, emergency_service, test_user):
        """Test emergency access activation"""
        # Generate emergency access code
        access = emergency_service.generate_emergency_access(
            user_id=test_user.id,
            reason="medical_emergency"
        )
        
        assert access["code"] is not None
        assert access["expires_at"] > datetime.now(pytz.UTC)
        
        # Verify emergency access
        verification = emergency_service.verify_emergency_access(
            user_id=test_user.id,
            access_code=access["code"]
        )
        
        assert verification["valid"] == True
        assert verification["access_level"] == "emergency"

    @pytest.mark.critical
    def test_multiple_missed_doses(self, emergency_service, test_user, critical_medication):
        """Test escalating response for multiple missed doses"""
        # Simulate multiple missed doses
        missed_times = [
            datetime.now(pytz.UTC) - timedelta(hours=h)
            for h in [2, 14, 26]  # 3 missed doses
        ]
        
        for time in missed_times:
            response = emergency_service.handle_missed_dose(
                user_id=test_user.id,
                medication_id=critical_medication.id,
                scheduled_time=time,
                current_time=datetime.now(pytz.UTC)
            )
            
            assert response["status"] == "emergency_activated"
        
        # Check escalation level
        status = emergency_service.get_emergency_status(
            user_id=test_user.id,
            medication_id=critical_medication.id
        )
        
        assert status["escalation_level"] >= 2
        assert status["missed_doses"] == len(missed_times)
