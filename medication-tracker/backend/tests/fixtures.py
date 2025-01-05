import pytest
from datetime import datetime, timedelta
from app import db
from app.models.user import User
from app.models.medication import Medication
from app.models.schedule import Schedule

@pytest.fixture
def test_user():
    """Create a test user"""
    user = User(
        email="test@example.com",
        name="Test User"
    )
    user.set_password("TestPassword123!")
    db.session.add(user)
    db.session.commit()
    yield user
    db.session.delete(user)
    db.session.commit()

@pytest.fixture
def auth_headers(test_user):
    """Generate authentication headers for test user"""
    token = test_user.get_token()
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def test_medication(test_user):
    """Create a test medication"""
    medication = Medication(
        name="Test Medication",
        description="Test description",
        dosage_form="tablet",
        strength="10mg",
        user_id=test_user.id
    )
    db.session.add(medication)
    db.session.commit()
    yield medication
    db.session.delete(medication)
    db.session.commit()

@pytest.fixture
def test_schedule(test_user, test_medication):
    """Create a test schedule"""
    schedule = Schedule(
        medication_id=test_medication.id,
        user_id=test_user.id,
        frequency="daily",
        times=["09:00", "21:00"],
        start_date=datetime.now(),
        end_date=datetime.now() + timedelta(days=30),
        dosage="10mg",
        instructions="Take with food"
    )
    db.session.add(schedule)
    db.session.commit()
    yield schedule
    db.session.delete(schedule)
    db.session.commit()

@pytest.fixture
def test_user_with_schedules(test_user):
    """Create a test user with multiple medication schedules"""
    # Create medications
    medications = []
    for i in range(3):
        med = Medication(
            name=f"Test Medication {i}",
            description=f"Test description {i}",
            dosage_form="tablet",
            strength=f"{10*(i+1)}mg",
            user_id=test_user.id
        )
        medications.append(med)
        db.session.add(med)
    
    db.session.commit()
    
    # Create schedules
    schedules = []
    times = [["09:00"], ["14:00"], ["20:00"]]
    for i, medication in enumerate(medications):
        schedule = Schedule(
            medication_id=medication.id,
            user_id=test_user.id,
            frequency="daily",
            times=times[i],
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=30),
            dosage=f"{10*(i+1)}mg",
            instructions=f"Test instructions {i}"
        )
        schedules.append(schedule)
        db.session.add(schedule)
    
    db.session.commit()
    
    yield test_user
    
    # Cleanup
    for schedule in schedules:
        db.session.delete(schedule)
    for medication in medications:
        db.session.delete(medication)
    db.session.commit()
