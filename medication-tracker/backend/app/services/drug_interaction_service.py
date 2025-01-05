import requests
from flask import current_app
import json
from datetime import datetime, timedelta
import logging

class DrugInteractionService:
    def __init__(self):
        self.base_url = "https://api.fda.gov/drug/label.json"
        self.interaction_cache = {}
        self.cache_duration = timedelta(days=7)  # Cache interaction data for 7 days

    def get_drug_interactions(self, drug_name):
        """
        Get drug interactions from the FDA API
        """
        try:
            # Check cache first
            cache_key = drug_name.lower()
            if cache_key in self.interaction_cache:
                cached_data = self.interaction_cache[cache_key]
                if datetime.now() - cached_data['timestamp'] < self.cache_duration:
                    return cached_data['data']

            # Query FDA API
            params = {
                'search': f'openfda.brand_name:"{drug_name}" OR openfda.generic_name:"{drug_name}"',
                'limit': 1
            }
            
            response = requests.get(self.base_url, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            if 'results' not in data or not data['results']:
                return None
                
            result = data['results'][0]
            interactions = {
                'drug_interactions': result.get('drug_interactions', []),
                'warnings': result.get('warnings', []),
                'contraindications': result.get('contraindications', []),
                'precautions': result.get('precautions', [])
            }
            
            # Cache the result
            self.interaction_cache[cache_key] = {
                'data': interactions,
                'timestamp': datetime.now()
            }
            
            return interactions

        except requests.exceptions.RequestException as e:
            current_app.logger.error(f"Error fetching drug interactions: {str(e)}")
            return None

    def check_interaction(self, med1_name, med2_name):
        """
        Check for interactions between two medications
        """
        try:
            med1_data = self.get_drug_interactions(med1_name)
            med2_data = self.get_drug_interactions(med2_name)
            
            if not med1_data or not med2_data:
                return None
                
            interactions = []
            
            # Check if med2 is mentioned in med1's interactions
            for interaction in med1_data['drug_interactions']:
                if med2_name.lower() in interaction.lower():
                    interactions.append({
                        'severity': 'high',
                        'description': interaction
                    })
                    
            # Check if med1 is mentioned in med2's interactions
            for interaction in med2_data['drug_interactions']:
                if med1_name.lower() in interaction.lower():
                    interactions.append({
                        'severity': 'high',
                        'description': interaction
                    })
                    
            # Check warnings and precautions
            for warning in med1_data['warnings'] + med1_data['precautions']:
                if med2_name.lower() in warning.lower():
                    interactions.append({
                        'severity': 'medium',
                        'description': warning
                    })
                    
            for warning in med2_data['warnings'] + med2_data['precautions']:
                if med1_name.lower() in warning.lower():
                    interactions.append({
                        'severity': 'medium',
                        'description': warning
                    })
            
            return interactions if interactions else None

        except Exception as e:
            current_app.logger.error(f"Error checking drug interactions: {str(e)}")
            return None

    def get_detailed_info(self, drug_name):
        """
        Get detailed information about a drug
        """
        try:
            params = {
                'search': f'openfda.brand_name:"{drug_name}" OR openfda.generic_name:"{drug_name}"',
                'limit': 1
            }
            
            response = requests.get(self.base_url, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            if 'results' not in data or not data['results']:
                return None
                
            result = data['results'][0]
            
            return {
                'brand_name': result.get('openfda', {}).get('brand_name', []),
                'generic_name': result.get('openfda', {}).get('generic_name', []),
                'description': result.get('description', []),
                'indications_and_usage': result.get('indications_and_usage', []),
                'dosage_and_administration': result.get('dosage_and_administration', []),
                'warnings': result.get('warnings', []),
                'drug_interactions': result.get('drug_interactions', []),
                'contraindications': result.get('contraindications', []),
                'adverse_reactions': result.get('adverse_reactions', []),
                'precautions': result.get('precautions', [])
            }

        except Exception as e:
            current_app.logger.error(f"Error fetching drug details: {str(e)}")
            return None

# Create singleton instance
drug_interaction_service = DrugInteractionService()
