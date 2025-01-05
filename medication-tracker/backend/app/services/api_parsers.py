import xml.etree.ElementTree as ET
from typing import Dict, Optional, List
import logging

logger = logging.getLogger(__name__)

class MedlinePlusParser:
    @staticmethod
    def parse_response(root: ET.Element) -> Optional[Dict]:
        """
        Parse MedlinePlus XML response
        Documentation: https://www.nlm.nih.gov/medlineplus/webservice.html
        """
        try:
            # Find the document element containing interaction info
            documents = root.findall(".//document")
            if not documents:
                return None

            # Extract content from the most relevant document
            doc = documents[0]
            content = doc.find(".//content")
            if content is None:
                return None

            text = content.text if content.text else ""
            
            # Analyze content for severity indicators
            severity = "Unknown"
            if any(word in text.lower() for word in ["severe", "dangerous", "avoid"]):
                severity = "Major"
            elif any(word in text.lower() for word in ["moderate", "caution"]):
                severity = "Moderate"
            elif any(word in text.lower() for word in ["mild", "minor"]):
                severity = "Minor"

            # Extract evidence level
            evidence = "Unknown"
            if "clinical studies show" in text.lower():
                evidence = "Strong"
            elif "some evidence suggests" in text.lower():
                evidence = "Moderate"
            elif "limited evidence" in text.lower():
                evidence = "Limited"

            return {
                'source': 'MedlinePlus',
                'severity': severity,
                'effect': text[:500],  # Limit effect text length
                'evidence': evidence
            }

        except Exception as e:
            logger.error(f"Error parsing MedlinePlus response: {str(e)}")
            return None

class DailyMedParser:
    @staticmethod
    def parse_response(data: Dict) -> Optional[Dict]:
        """
        Parse DailyMed JSON response
        Documentation: https://dailymed.nlm.nih.gov/dailymed/app-support-web-services.cfm
        """
        try:
            if not data or 'data' not in data:
                return None

            sections = data.get('data', {}).get('sections', [])
            interaction_section = None

            # Find the drug interactions section
            for section in sections:
                if 'drug interactions' in section.get('title', '').lower():
                    interaction_section = section
                    break

            if not interaction_section:
                return None

            text = interaction_section.get('text', '')
            
            # Analyze content for severity
            severity = "Unknown"
            if any(word in text.lower() for word in ["contraindicated", "serious", "severe"]):
                severity = "Major"
            elif any(word in text.lower() for word in ["moderate", "caution"]):
                severity = "Moderate"
            elif any(word in text.lower() for word in ["mild", "minor"]):
                severity = "Minor"

            return {
                'source': 'DailyMed',
                'severity': severity,
                'effect': text[:500] if text else "No specific interaction information available",
                'evidence': 'Strong'  # DailyMed data is from FDA-approved labeling
            }

        except Exception as e:
            logger.error(f"Error parsing DailyMed response: {str(e)}")
            return None

class NCCIHParser:
    @staticmethod
    def parse_response(data: Dict) -> Optional[Dict]:
        """
        Parse NCCIH JSON response
        Documentation: https://www.nccih.nih.gov/health/developers
        """
        try:
            if not data or 'result' not in data:
                return None

            result = data['result']
            safety_info = result.get('safety', {})
            interactions = safety_info.get('interactions', [])
            
            if not interactions:
                return None

            # Combine all interaction information
            combined_text = " ".join(interactions)
            
            # Analyze content for severity
            severity = "Unknown"
            if any(word in combined_text.lower() for word in ["severe", "serious", "avoid"]):
                severity = "Major"
            elif any(word in combined_text.lower() for word in ["moderate", "caution"]):
                severity = "Moderate"
            elif any(word in combined_text.lower() for word in ["mild", "minor"]):
                severity = "Minor"

            # Determine evidence level
            evidence = "Unknown"
            if result.get('evidence_level') == 'A':
                evidence = "Strong"
            elif result.get('evidence_level') == 'B':
                evidence = "Moderate"
            elif result.get('evidence_level') == 'C':
                evidence = "Limited"

            return {
                'source': 'NCCIH',
                'severity': severity,
                'effect': combined_text[:500],
                'evidence': evidence
            }

        except Exception as e:
            logger.error(f"Error parsing NCCIH response: {str(e)}")
            return None

class OpenFDAParser:
    @staticmethod
    def parse_response(data: Dict) -> Optional[Dict]:
        """
        Parse OpenFDA JSON response
        Documentation: https://open.fda.gov/apis/
        """
        try:
            if not data or 'results' not in data:
                return None

            results = data['results']
            if not results:
                return None

            # Get the most recent result
            result = results[0]
            
            # Look for interaction information in various sections
            warnings = result.get('warnings', [])
            precautions = result.get('precautions', [])
            drug_interactions = result.get('drug_interactions', [])
            
            # Combine all relevant text
            combined_text = " ".join(warnings + precautions + drug_interactions)
            
            if not combined_text:
                return None

            # Analyze content for severity
            severity = "Unknown"
            if any(word in combined_text.lower() for word in ["contraindicated", "serious", "severe"]):
                severity = "Major"
            elif any(word in combined_text.lower() for word in ["moderate", "caution"]):
                severity = "Moderate"
            elif any(word in combined_text.lower() for word in ["mild", "minor"]):
                severity = "Minor"

            return {
                'source': 'OpenFDA',
                'severity': severity,
                'effect': combined_text[:500],
                'evidence': 'Strong'  # OpenFDA data is from FDA-approved labeling
            }

        except Exception as e:
            logger.error(f"Error parsing OpenFDA response: {str(e)}")
            return None

def combine_interaction_data(sources: List[Dict]) -> Dict:
    """
    Combine and normalize interaction data from multiple sources
    """
    if not sources:
        return {
            'severity': 'Unknown',
            'effect': 'No interaction information available',
            'evidence': 'Unknown',
            'sources': []
        }

    # Get unique sources
    source_names = list(set(s['source'] for s in sources if s))

    # Determine overall severity (use the highest severity found)
    severity_levels = {'Major': 3, 'Moderate': 2, 'Minor': 1, 'Unknown': 0}
    max_severity = max(sources, key=lambda x: severity_levels.get(x['severity'], 0))['severity']

    # Combine effects from different sources
    effects = []
    for source in sources:
        if source and source.get('effect'):
            effects.append(f"[{source['source']}] {source['effect']}")

    # Determine overall evidence level
    evidence_levels = {'Strong': 3, 'Moderate': 2, 'Limited': 1, 'Unknown': 0}
    max_evidence = max(sources, key=lambda x: evidence_levels.get(x['evidence'], 0))['evidence']

    return {
        'severity': max_severity,
        'effect': ' | '.join(effects),
        'evidence': max_evidence,
        'sources': source_names
    }
