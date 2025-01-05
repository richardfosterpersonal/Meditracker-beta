import requests
from flask import current_app
import json
from datetime import datetime, timedelta
import os
import logging
from typing import List, Dict, Optional
import xml.etree.ElementTree as ET
from app.services.api_parsers import (
    MedlinePlusParser, DailyMedParser, NCCIHParser, OpenFDAParser,
    combine_interaction_data
)

class HerbDrugInteractionService:
    def __init__(self):
        self.medline_base_url = 'https://wsearch.nlm.nih.gov/ws/query'
        self.dailymed_base_url = 'https://dailymed.nlm.nih.gov/dailymed/services'
        self.nccih_base_url = 'https://nccih.nih.gov/api/v1'
        self.openfda_base_url = 'https://api.fda.gov/drug'
        self.cache = {}
        self.cache_duration = timedelta(days=7)
        self.interaction_cache = {}

    async def check_interaction(self, herb: str, drug: str) -> Dict:
        """
        Check for interactions between an herb and a drug using multiple sources
        """
        try:
            interaction_data = []
            
            # Check MedlinePlus
            medline_data = await self._check_medlineplus(herb, drug)
            if medline_data:
                parsed_medline = MedlinePlusParser.parse_response(medline_data)
                if parsed_medline:
                    interaction_data.append(parsed_medline)

            # Check DailyMed
            dailymed_data = await self._check_dailymed(herb, drug)
            if dailymed_data:
                parsed_dailymed = DailyMedParser.parse_response(dailymed_data)
                if parsed_dailymed:
                    interaction_data.append(parsed_dailymed)

            # Check NCCIH
            nccih_data = await self._check_nccih(herb)
            if nccih_data:
                parsed_nccih = NCCIHParser.parse_response(nccih_data)
                if parsed_nccih:
                    interaction_data.append(parsed_nccih)

            # Check OpenFDA
            openfda_data = await self._check_openfda(drug)
            if openfda_data:
                parsed_openfda = OpenFDAParser.parse_response(openfda_data)
                if parsed_openfda:
                    interaction_data.append(parsed_openfda)

            # Combine and normalize the interaction data
            combined_data = combine_interaction_data(interaction_data)
            
            # Add cache key for future reference
            cache_key = f"{herb.lower()}_{drug.lower()}"
            self.interaction_cache[cache_key] = {
                'data': combined_data,
                'timestamp': datetime.now()
            }
            
            return combined_data

        except Exception as e:
            logger.error(f"Error checking interaction between {herb} and {drug}: {str(e)}")
            return {
                'severity': 'Unknown',
                'effect': f'Error checking interaction: {str(e)}',
                'evidence': 'Unknown',
                'sources': []
            }

    async def _check_medlineplus(self, herb: str, drug: str) -> Optional[Dict]:
        """Query MedlinePlus for interaction data"""
        try:
            params = {
                'db': 'healthTopics',
                'term': f'{herb} {drug} interaction',
                'retmax': 1
            }
            response = requests.get(self.medline_base_url, params=params)
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            logger.error(f"MedlinePlus API error: {str(e)}")
            return None

    async def _check_dailymed(self, herb: str, drug: str) -> Optional[Dict]:
        """Query DailyMed for interaction data"""
        try:
            params = {
                'drug_name': drug,
                'search_term': herb
            }
            response = requests.get(f"{self.dailymed_base_url}/drugnames.json", params=params)
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            logger.error(f"DailyMed API error: {str(e)}")
            return None

    async def _check_nccih(self, herb: str) -> Optional[Dict]:
        """Query NCCIH for herb information"""
        try:
            params = {
                'term': herb,
                'type': 'herb'
            }
            response = requests.get(f"{self.nccih_base_url}/search", params=params)
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            logger.error(f"NCCIH API error: {str(e)}")
            return None

    async def _check_openfda(self, drug: str) -> Optional[Dict]:
        """Query OpenFDA for drug information"""
        try:
            params = {
                'search': f'openfda.brand_name:{drug}',
                'limit': 1
            }
            response = requests.get(f"{self.openfda_base_url}/enforcement.json", params=params)
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            logger.error(f"OpenFDA API error: {str(e)}")
            return None

# Create singleton instance
herb_drug_interaction_service = HerbDrugInteractionService()
