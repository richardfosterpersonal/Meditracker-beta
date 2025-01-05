from app import db
from datetime import datetime

class Profile(db.Model):
    __tablename__ = 'profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    phone = db.Column(db.String(20))
    date_of_birth = db.Column(db.Date, nullable=True)
    address = db.Column(db.String(200))
    emergency_contact_name = db.Column(db.String(100))
    emergency_contact_phone = db.Column(db.String(20))
    emergency_contact_relationship = db.Column(db.String(50))
    medical_conditions = db.Column(db.Text)
    allergies = db.Column(db.Text)
    blood_type = db.Column(db.String(10))
    preferred_pharmacy = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'firstName': self.first_name,
            'lastName': self.last_name,
            'phone': self.phone,
            'dateOfBirth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'address': self.address,
            'emergencyContact': {
                'name': self.emergency_contact_name,
                'phone': self.emergency_contact_phone,
                'relationship': self.emergency_contact_relationship
            },
            'medicalConditions': self.medical_conditions,
            'allergies': self.allergies,
            'bloodType': self.blood_type,
            'preferredPharmacy': self.preferred_pharmacy,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }

    @staticmethod
    def create_profile(user_id, data):
        profile = Profile(
            user_id=user_id,
            first_name=data.get('firstName', ''),
            last_name=data.get('lastName', ''),
            phone=data.get('phone'),
            date_of_birth=datetime.strptime(data['dateOfBirth'], '%Y-%m-%d').date() if data.get('dateOfBirth') else None,
            address=data.get('address'),
            emergency_contact_name=data.get('emergencyContact', {}).get('name'),
            emergency_contact_phone=data.get('emergencyContact', {}).get('phone'),
            emergency_contact_relationship=data.get('emergencyContact', {}).get('relationship'),
            medical_conditions=data.get('medicalConditions'),
            allergies=data.get('allergies'),
            blood_type=data.get('bloodType'),
            preferred_pharmacy=data.get('preferredPharmacy')
        )
        return profile

    def update_from_dict(self, data):
        self.first_name = data.get('firstName', self.first_name)
        self.last_name = data.get('lastName', self.last_name)
        self.phone = data.get('phone', self.phone)
        if data.get('dateOfBirth'):
            self.date_of_birth = datetime.strptime(data['dateOfBirth'], '%Y-%m-%d').date()
        self.address = data.get('address', self.address)
        
        emergency_contact = data.get('emergencyContact', {})
        self.emergency_contact_name = emergency_contact.get('name', self.emergency_contact_name)
        self.emergency_contact_phone = emergency_contact.get('phone', self.emergency_contact_phone)
        self.emergency_contact_relationship = emergency_contact.get('relationship', self.emergency_contact_relationship)
        
        self.medical_conditions = data.get('medicalConditions', self.medical_conditions)
        self.allergies = data.get('allergies', self.allergies)
        self.blood_type = data.get('bloodType', self.blood_type)
        self.preferred_pharmacy = data.get('preferredPharmacy', self.preferred_pharmacy)
