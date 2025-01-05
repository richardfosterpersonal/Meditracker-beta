"""Service for checking medication interactions."""

from typing import List, Dict, Optional
import logging
from datetime import datetime
import requests
from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..domain.medication.entities import Medication
from ..infrastructure.repositories.medication_repository import SQLMedicationRepository
from ..security.sql_security import secure_query_wrapper
from ..core.config import get_settings

logger = logging.getLogger(__name__)

class InteractionService:
    """Service for managing medication interactions."""

    def __init__(self, db: Session):
        self.db = db
        self.medication_repository = SQLMedicationRepository(db)
        self.settings = get_settings()
        self._setup_api_client()

    def _setup_api_client(self) -> None:
        """Setup the API client with security headers."""
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'MedicationTracker/1.0',
            'X-API-Key': self.settings.DRUG_API_KEY,
            'Accept': 'application/json'
        })

    @secure_query_wrapper
    def check_interactions(
        self,
        medication_ids: List[int],
        user_id: int
    ) -> Dict[str, List[str]]:
        """
        Check for interactions between medications.
        
        Args:
            medication_ids: List of medication IDs to check
            user_id: ID of the user requesting the check
            
        Returns:
            Dictionary of interactions found
            
        Raises:
            HTTPException: If validation fails or API error occurs
            ValueError: If input validation fails
        """
        try:
            # Input validation
            if not medication_ids:
                raise ValueError("No medications provided for interaction check")
            
            if not isinstance(medication_ids, list):
                raise ValueError("medication_ids must be a list")
            
            if not all(isinstance(id, int) for id in medication_ids):
                raise ValueError("All medication IDs must be integers")
            
            # Verify user has access to these medications
            medications = []
            for med_id in medication_ids:
                medication = self.medication_repository.get_by_id(med_id)
                if not medication:
                    raise ValueError(f"Medication {med_id} not found")
                if medication.user_id != user_id:
                    raise HTTPException(
                        status_code=403,
                        detail="Unauthorized access to medication"
                    )
                medications.append(medication)

            # Log interaction check
            logger.info(
                f"Checking interactions for medications: {medication_ids} "
                f"requested by user: {user_id}"
            )

            return self._check_drug_interactions(medications)

        except ValueError as e:
            logger.error(f"Validation error in interaction check: {str(e)}")
            raise
        except HTTPException:
            logger.error(
                f"Unauthorized interaction check attempt for user {user_id}"
            )
            raise
        except Exception as e:
            logger.error(f"Error checking interactions: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Error checking medication interactions"
            )

    def _check_drug_interactions(
        self,
        medications: List[Medication]
    ) -> Dict[str, List[str]]:
        """
        Internal method to check drug interactions using external API.
        
        Args:
            medications: List of medications to check
            
        Returns:
            Dictionary of interactions found
            
        Raises:
            HTTPException: If API error occurs
        """
        try:
            # Prepare medication names for API call
            med_names = [med.name for med in medications]
            
            # Call external API with retry logic
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    response = self.session.post(
                        f"{self.settings.DRUG_API_BASE_URL}/interactions",
                        json={"medications": med_names},
                        timeout=10
                    )
                    response.raise_for_status()
                    break
                except requests.RequestException as e:
                    if attempt == max_retries - 1:
                        raise
                    logger.warning(
                        f"API request attempt {attempt + 1} failed: {str(e)}"
                    )
                    continue

            interactions = response.json()
            
            # Validate response format
            if not isinstance(interactions, dict):
                raise ValueError("Invalid API response format")

            # Log successful interaction check
            logger.info(
                f"Successfully checked interactions for medications: {med_names}"
            )

            return interactions

        except requests.RequestException as e:
            logger.error(f"API error checking drug interactions: {str(e)}")
            raise HTTPException(
                status_code=503,
                detail="Drug interaction service temporarily unavailable"
            )
        except ValueError as e:
            logger.error(f"Invalid response from drug interaction API: {str(e)}")
            raise HTTPException(
                status_code=502,
                detail="Invalid response from drug interaction service"
            )
        except Exception as e:
            logger.error(f"Unexpected error in drug interaction check: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Error checking drug interactions"
            )
