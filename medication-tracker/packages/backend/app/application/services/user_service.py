from datetime import datetime, timedelta
from typing import List, Optional, Dict
from app.domain.user.repositories import UserRepository, CarerRepository
from app.domain.medication.repositories import MedicationRepository
from app.domain.notification.services import NotificationDomainService
from app.application.services.auth_service import AuthService
from app.application.dtos.user import (
    CreateUserDTO,
    UpdateUserDTO,
    UserResponseDTO,
    CreateCarerDTO,
    CarerResponseDTO,
    CarerAssignmentDTO,
    CarerAssignmentResponseDTO,
    PasswordResetRequestDTO,
    PasswordResetDTO,
    ChangePasswordDTO,
    EmailVerificationDTO,
    UserStatsDTO
)
from app.application.exceptions import (
    ValidationError,
    NotFoundException,
    UnauthorizedError,
    ConflictError
)

class UserApplicationService:
    def __init__(
        self,
        user_repository: UserRepository,
        carer_repository: CarerRepository,
        medication_repository: MedicationRepository,
        notification_service: NotificationDomainService,
        auth_service: AuthService
    ):
        self._user_repository = user_repository
        self._carer_repository = carer_repository
        self._medication_repository = medication_repository
        self._notification_service = notification_service
        self._auth_service = auth_service

    async def create_user(self, dto: CreateUserDTO) -> UserResponseDTO:
        """Create a new user"""
        # Check if email already exists
        if self._user_repository.get_by_email(dto.email):
            raise ConflictError("Email already registered")

        # Create user entity
        user = User(
            name=dto.name,
            email=dto.email,
            password_hash=self._auth_service.hash_password(dto.password),
            notification_preferences=dto.notification_preferences or NotificationPreferencesDTO(),
            email_verified=False,
            is_admin=False,
            is_carer=False
        )

        # Save user
        saved_user = self._user_repository.save(user)

        # Send verification email
        await self._send_verification_email(saved_user)

        return self._to_user_response(saved_user)

    async def update_user(
        self,
        user_id: int,
        dto: UpdateUserDTO,
        requesting_user_id: int
    ) -> UserResponseDTO:
        """Update user details"""
        # Get user
        user = self._user_repository.get_by_id(user_id)
        if not user:
            raise NotFoundException("User not found")

        # Check authorization
        if requesting_user_id != user_id:
            raise UnauthorizedError("Not authorized to update this user")

        # Update fields
        if dto.name:
            user.name = dto.name
        if dto.email and dto.email != user.email:
            # Check if new email is available
            if self._user_repository.get_by_email(dto.email):
                raise ConflictError("Email already registered")
            user.email = dto.email
            user.email_verified = False
            await self._send_verification_email(user)
        if dto.notification_preferences:
            user.notification_preferences = dto.notification_preferences

        # Save updates
        updated_user = self._user_repository.update(user)
        return self._to_user_response(updated_user)

    async def create_carer(self, dto: CreateCarerDTO) -> CarerResponseDTO:
        """Create a new carer profile"""
        # Get user
        user = self._user_repository.get_by_id(dto.user_id)
        if not user:
            raise NotFoundException("User not found")

        # Check if already a carer
        if self._carer_repository.get_by_user_id(dto.user_id):
            raise ConflictError("User already has a carer profile")

        # Create carer entity
        carer = Carer(
            user_id=dto.user_id,
            type=dto.type,
            verified=False,
            qualifications=dto.qualifications
        )

        # Save carer
        saved_carer = self._carer_repository.save(carer)

        # Update user
        user.is_carer = True
        self._user_repository.update(user)

        return self._to_carer_response(saved_carer)

    async def assign_carer(
        self,
        dto: CarerAssignmentDTO,
        assigning_user_id: int
    ) -> CarerAssignmentResponseDTO:
        """Assign a carer to a patient"""
        # Get carer
        carer = self._carer_repository.get_by_id(dto.carer_id)
        if not carer:
            raise NotFoundException("Carer not found")

        # Get patient
        patient = self._user_repository.get_by_id(dto.patient_id)
        if not patient:
            raise NotFoundException("Patient not found")

        # Check authorization
        if assigning_user_id != dto.patient_id:
            raise UnauthorizedError("Not authorized to assign carers")

        # Create assignment
        assignment = CarerAssignment(
            carer_id=dto.carer_id,
            patient_id=dto.patient_id,
            permissions=dto.permissions,
            active=True
        )

        # Save assignment
        saved_assignment = self._carer_repository.save_assignment(assignment)

        # Update carer's patient list
        carer.add_patient(dto.patient_id)
        self._carer_repository.update(carer)

        # Notify carer
        await self._notification_service.create_notification(
            notification_type="carer_assignment",
            user_id=carer.user_id,
            data={
                "patient_id": dto.patient_id,
                "patient_name": patient.name,
                "permissions": dto.permissions
            },
            carer_id=carer.id
        )

        return CarerAssignmentResponseDTO(
            id=saved_assignment.id,
            carer_id=saved_assignment.carer_id,
            patient_id=saved_assignment.patient_id,
            permissions=saved_assignment.permissions,
            active=saved_assignment.active,
            created_at=saved_assignment.created_at,
            updated_at=saved_assignment.updated_at,
            success=True
        )

    async def request_password_reset(self, dto: PasswordResetRequestDTO) -> None:
        """Request password reset"""
        user = self._user_repository.get_by_email(dto.email)
        if user:
            # Generate reset token
            token = self._auth_service._create_access_token(user.id)
            
            # Send reset email
            await self._notification_service.create_notification(
                notification_type="password_reset",
                user_id=user.id,
                data={"reset_token": token},
                urgency="normal"
            )

    async def reset_password(self, dto: PasswordResetDTO) -> None:
        """Reset password using token"""
        try:
            # Validate token
            user_id, _ = self._auth_service.validate_token(dto.token)
            
            # Get user
            user = self._user_repository.get_by_id(user_id)
            if not user:
                raise UnauthorizedError("Invalid token")

            # Update password
            user.password_hash = self._auth_service.hash_password(dto.new_password)
            self._user_repository.update(user)

        except UnauthorizedError:
            raise ValidationError("Invalid or expired reset token")

    async def change_password(
        self,
        user_id: int,
        dto: ChangePasswordDTO
    ) -> None:
        """Change password"""
        user = self._user_repository.get_by_id(user_id)
        if not user:
            raise NotFoundException("User not found")

        # Verify current password
        if not self._auth_service._verify_password(
            dto.current_password,
            user.password_hash
        ):
            raise ValidationError("Current password is incorrect")

        # Update password
        user.password_hash = self._auth_service.hash_password(dto.new_password)
        self._user_repository.update(user)

    async def verify_email(
        self,
        user_id: int,
        dto: EmailVerificationDTO
    ) -> None:
        """Verify email address"""
        try:
            # Validate token
            token_user_id, _ = self._auth_service.validate_token(dto.token)
            
            if token_user_id != user_id:
                raise UnauthorizedError("Invalid token")

            # Get user
            user = self._user_repository.get_by_id(user_id)
            if not user:
                raise NotFoundException("User not found")

            # Update verification status
            user.email_verified = True
            self._user_repository.update(user)

        except UnauthorizedError:
            raise ValidationError("Invalid or expired verification token")

    async def get_user_stats(
        self,
        user_id: int,
        requesting_user_id: int
    ) -> UserStatsDTO:
        """Get user statistics"""
        # Check authorization
        if requesting_user_id != user_id:
            carer = self._carer_repository.get_by_user_id(requesting_user_id)
            if not carer or user_id not in carer.patients:
                raise UnauthorizedError(
                    "Not authorized to view stats for this user"
                )

        # Get all medications
        medications = self._medication_repository.get_by_user_id(user_id)
        
        # Calculate statistics
        now = datetime.utcnow()
        today = now.date()
        active_meds = [m for m in medications if not m.schedule.end_date or m.schedule.end_date.date() >= today]
        
        total_doses = 0
        taken_doses = 0
        upcoming_doses = 0
        missed_doses = 0
        refills_needed = 0
        last_taken = None

        for med in medications:
            # Count doses
            if med.doses:
                taken_doses += len(med.doses)
                last_med_taken = max(dose.taken_at for dose in med.doses)
                if not last_taken or last_med_taken > last_taken:
                    last_taken = last_med_taken

            # Count scheduled doses
            daily_doses = len(med.schedule.dose_times)
            days = (min(today, med.schedule.end_date.date() if med.schedule.end_date else today) - 
                   med.schedule.start_date.date()).days + 1
            total_doses += daily_doses * days

            # Check upcoming doses
            if med in active_meds:
                for dose_time in med.schedule.dose_times:
                    dose_dt = datetime.strptime(dose_time, "%H:%M").time()
                    if dose_dt > now.time():
                        upcoming_doses += 1

            # Check missed doses
            if med.last_taken:
                expected_doses = daily_doses * (today - med.last_taken.date()).days
                actual_doses = med.daily_doses_taken
                missed_doses += max(0, expected_doses - actual_doses)

            # Check refills
            if med.remaining_doses is not None and med.remaining_doses <= 7:
                refills_needed += 1

        compliance_rate = (taken_doses / total_doses) if total_doses > 0 else 1.0

        return UserStatsDTO(
            total_medications=len(medications),
            active_medications=len(active_meds),
            compliance_rate=compliance_rate,
            last_medication_taken=last_taken,
            upcoming_doses=upcoming_doses,
            missed_doses=missed_doses,
            refills_needed=refills_needed
        )

    async def _send_verification_email(self, user: 'User') -> None:
        """Send email verification"""
        token = self._auth_service._create_access_token(user.id)
        
        await self._notification_service.create_notification(
            notification_type="email_verification",
            user_id=user.id,
            data={"verification_token": token},
            urgency="normal"
        )

    def _to_user_response(self, user: 'User') -> UserResponseDTO:
        """Convert user entity to response DTO"""
        return UserResponseDTO(
            id=user.id,
            name=user.name,
            email=user.email,
            email_verified=user.email_verified,
            notification_preferences=user.notification_preferences,
            is_admin=user.is_admin,
            is_carer=user.is_carer,
            last_login=user.last_login,
            created_at=user.created_at,
            updated_at=user.updated_at,
            success=True
        )

    def _to_carer_response(self, carer: 'Carer') -> CarerResponseDTO:
        """Convert carer entity to response DTO"""
        return CarerResponseDTO(
            id=carer.id,
            user_id=carer.user_id,
            type=carer.type,
            verified=carer.verified,
            qualifications=carer.qualifications,
            patients=carer.patients,
            created_at=carer.created_at,
            updated_at=carer.updated_at,
            success=True
        )
