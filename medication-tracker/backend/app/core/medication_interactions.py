from typing import List, Dict, Optional
from datetime import datetime, time
from app.services.drug_interaction_service import drug_interaction_service
from app.services.herb_drug_interaction_service import herb_drug_interaction_service
from app.models.medication import Medication
import logging

logger = logging.getLogger(__name__)

class InteractionChecker:
    """
    Core service for checking medication interactions.
    Integrates drug-drug and herb-drug interaction checking.
    """
    
    def __init__(self):
        self.drug_service = drug_interaction_service
        self.herb_service = herb_drug_interaction_service
        
    def check_interactions(self, medications: List[Medication]) -> List[Dict]:
        """
        Check for interactions between multiple medications
        
        Args:
            medications: List of Medication objects to check
            
        Returns:
            List of interaction dictionaries containing severity and descriptions
        """
        if len(medications) < 2:
            return []
            
        interactions = []
        checked_pairs = set()
        
        for i, med1 in enumerate(medications):
            for j, med2 in enumerate(medications[i+1:], i+1):
                pair_key = tuple(sorted([med1.name, med2.name]))
                if pair_key in checked_pairs:
                    continue
                    
                checked_pairs.add(pair_key)
                
                # Check drug-drug interactions
                drug_interactions = self.drug_service.check_interaction(med1.name, med2.name)
                if drug_interactions:
                    for interaction in drug_interactions:
                        enriched = self._enrich_interaction(interaction, med1, med2)
                        interactions.append(enriched)
                
                # Check herb-drug interactions if applicable
                if self._is_herb(med1.name):
                    herb_interactions = self.herb_service.check_interaction(med1.name, med2.name)
                    if herb_interactions:
                        for interaction in herb_interactions:
                            enriched = self._enrich_interaction(interaction, med1, med2)
                            interactions.append(enriched)
                            
                if self._is_herb(med2.name):
                    herb_interactions = self.herb_service.check_interaction(med2.name, med1.name)
                    if herb_interactions:
                        for interaction in herb_interactions:
                            enriched = self._enrich_interaction(interaction, med1, med2)
                            interactions.append(enriched)
                            
                # Check timing-based interactions
                timing_interactions = self._check_timing_interactions(med1, med2)
                if timing_interactions:
                    interactions.extend(timing_interactions)
        
        return interactions
    
    def _is_herb(self, medication_name: str) -> bool:
        """Check if a medication is an herbal supplement"""
        # This is a simple check - in production you'd want a more comprehensive database
        common_herbs = {
            'ginkgo', 'ginseng', 'st john\'s wort', 'garlic', 'echinacea',
            'valerian', 'kava', 'ginger', 'turmeric', 'chamomile'
        }
        return medication_name.lower() in common_herbs
    
    def _check_timing_interactions(self, med1: Medication, med2: Medication) -> List[Dict]:
        """Check for interactions based on medication timing"""
        interactions = []
        
        # Get schedules for both medications
        schedule1 = med1.schedule if hasattr(med1, 'schedule') else None
        schedule2 = med2.schedule if hasattr(med2, 'schedule') else None
        
        if not schedule1 or not schedule2:
            return []
            
        # Check for close timing
        for time1 in schedule1:
            for time2 in schedule2:
                if self._times_too_close(time1, time2):
                    interactions.append({
                        'severity': 'moderate',
                        'description': f'Medications {med1.name} and {med2.name} are scheduled too close together',
                        'recommendation': 'Consider spacing these medications at least 2 hours apart',
                        'type': 'timing'
                    })
                    
        return interactions
    
    def _times_too_close(self, time1: time, time2: time, min_gap_hours: int = 2) -> bool:
        """Check if two medication times are too close together"""
        # Convert times to minutes since midnight for easier comparison
        t1_mins = time1.hour * 60 + time1.minute
        t2_mins = time2.hour * 60 + time2.minute
        
        # Calculate difference accounting for wraparound at midnight
        diff = min(
            abs(t1_mins - t2_mins),
            1440 - abs(t1_mins - t2_mins)  # 1440 = minutes in a day
        )
        
        return diff < (min_gap_hours * 60)
    
    def _enrich_interaction(self, interaction: Dict, med1: Medication, med2: Medication) -> Dict:
        """Enrich interaction data with recommendations and context"""
        enriched = interaction.copy()
        
        # Add medication names if not present
        if 'medications' not in enriched:
            enriched['medications'] = [med1.name, med2.name]
            
        # Add recommendation if not present
        if 'recommendation' not in enriched:
            enriched['recommendation'] = self._generate_recommendation(
                enriched['severity'],
                med1.name,
                med2.name
            )
            
        return enriched
    
    def _generate_recommendation(self, severity: str, med1_name: str, med2_name: str) -> str:
        """Generate a recommendation based on interaction severity"""
        if severity == 'high':
            return (
                f'Avoid taking {med1_name} and {med2_name} together. '
                'Consult your healthcare provider immediately.'
            )
        elif severity == 'moderate':
            return (
                f'Monitor for side effects when taking {med1_name} with {med2_name}. '
                'Consider spacing doses apart and consult your healthcare provider.'
            )
        else:
            return (
                f'Be aware of potential mild interactions between {med1_name} and {med2_name}. '
                'Monitor for any unusual effects.'
            )
