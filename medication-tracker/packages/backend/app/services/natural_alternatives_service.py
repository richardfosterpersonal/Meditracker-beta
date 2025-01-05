import requests
from flask import current_app
import json
from datetime import datetime, timedelta
import os
import logging

class NaturalAlternativesService:
    def __init__(self):
        self.cache = {}
        self.cache_duration = timedelta(days=7)  # Cache natural alternatives data for 7 days
        
    def get_natural_alternatives(self, medication_name, condition=None):
        """
        Get natural alternatives for a medication or medical condition.
        
        Args:
            medication_name (str): Name of the medication
            condition (str, optional): Medical condition to find alternatives for
            
        Returns:
            dict: Natural alternatives information including herbs, supplements, and lifestyle changes
        """
        try:
            cache_key = f"{medication_name}_{condition}" if condition else medication_name
            
            # Check cache first
            if cache_key in self.cache:
                cached_data = self.cache[cache_key]
                if datetime.now() - cached_data['timestamp'] < self.cache_duration:
                    return cached_data['data']
            
            # This would typically call an external API. For now, we'll use a curated dataset
            alternatives = self._get_curated_alternatives(medication_name, condition)
            
            # Cache the results
            self.cache[cache_key] = {
                'timestamp': datetime.now(),
                'data': alternatives
            }
            
            return alternatives
            
        except Exception as e:
            current_app.logger.error(f"Error fetching natural alternatives: {str(e)}")
            return None

    def _get_curated_alternatives(self, medication_name, condition=None):
        """
        Get natural alternatives from our curated dataset.
        This is a simplified version - in production, this would be connected to a proper database
        or external API for comprehensive alternative medicine data.
        """
        # Simplified dataset of common medications and their natural alternatives
        alternatives_db = {
            'ibuprofen': {
                'herbs': [
                    {'name': 'Turmeric', 'description': 'Natural anti-inflammatory properties'},
                    {'name': 'Ginger', 'description': 'Reduces inflammation and pain'},
                    {'name': 'White Willow Bark', 'description': 'Natural pain reliever'}
                ],
                'supplements': [
                    {'name': 'Omega-3', 'description': 'Reduces inflammation'},
                    {'name': 'Glucosamine', 'description': 'Supports joint health'}
                ],
                'lifestyle': [
                    'Regular exercise',
                    'Hot/cold therapy',
                    'Stress reduction techniques'
                ],
                'precautions': [
                    'Consult healthcare provider before starting any alternative treatment',
                    'Some herbs may interact with existing medications',
                    'Natural alternatives may take longer to show effects'
                ]
            },
            'omeprazole': {
                'herbs': [
                    {'name': 'Deglycyrrhizinated Licorice (DGL)', 'description': 'Supports digestive health'},
                    {'name': 'Slippery Elm', 'description': 'Soothes digestive tract'},
                    {'name': 'Marshmallow Root', 'description': 'Protective effect on stomach'}
                ],
                'supplements': [
                    {'name': 'Probiotics', 'description': 'Supports gut health'},
                    {'name': 'Zinc Carnosine', 'description': 'Supports stomach lining health'}
                ],
                'lifestyle': [
                    'Dietary modifications',
                    'Eating smaller meals',
                    'Avoiding trigger foods',
                    'Not lying down after meals'
                ],
                'precautions': [
                    'Consult healthcare provider before discontinuing any prescribed medication',
                    'Monitor symptoms closely when trying alternatives',
                    'Some alternatives may take time to show effect'
                ]
            },
            # Add more medications as needed
        }
        
        # Default response structure if no specific alternatives are found
        default_response = {
            'herbs': [],
            'supplements': [],
            'lifestyle': [
                'Regular exercise',
                'Balanced diet',
                'Adequate sleep',
                'Stress management'
            ],
            'precautions': [
                'Always consult with healthcare provider before starting any alternative treatment',
                'Natural alternatives should not replace prescribed medications without medical supervision',
                'Monitor your symptoms closely when trying alternatives'
            ]
        }
        
        # Convert medication name to lowercase for case-insensitive matching
        medication_name = medication_name.lower()
        
        # Return specific alternatives if available, otherwise return default response
        return alternatives_db.get(medication_name, default_response)

    def get_safety_information(self, alternative_name):
        """
        Get safety information for a specific natural alternative
        
        Args:
            alternative_name (str): Name of the natural alternative
            
        Returns:
            dict: Safety information including interactions, contraindications, and dosage guidelines
        """
        # This would typically call an external API or database
        # For now, returning basic safety information
        return {
            'general_precautions': [
                'Consult with healthcare provider before use',
                'Start with lower doses to test tolerance',
                'Monitor for adverse reactions',
                'Keep track of any changes in symptoms'
            ],
            'possible_interactions': [
                'May interact with blood thinners',
                'May affect blood sugar levels',
                'May interact with other medications'
            ],
            'contraindications': [
                'Pregnancy or breastfeeding (consult healthcare provider)',
                'Certain medical conditions may be contraindicated',
                'May not be suitable for children'
            ],
            'recommended_usage': [
                'Follow product-specific dosage guidelines',
                'Start with minimum effective dose',
                'Monitor effects and adjust as needed',
                'Discontinue use if adverse effects occur'
            ]
        }

# Create singleton instance
natural_alternatives_service = NaturalAlternativesService()
