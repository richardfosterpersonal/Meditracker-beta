import unittest
import asyncio
import json
import xml.etree.ElementTree as ET
from unittest.mock import Mock, patch
from app.services.api_parsers import (
    MedlinePlusParser, DailyMedParser, NCCIHParser, OpenFDAParser,
    combine_interaction_data
)

class TestHerbDrugParsers(unittest.TestCase):
    def setUp(self):
        self.sample_medline_xml = '<?xml version="1.0" encoding="UTF-8"?><result><document><content>Severe interaction between St. John\'s Wort and SSRIs. Clinical studies show increased risk.</content></document></result>'
        
        self.sample_dailymed_data = {
            'data': {
                'sections': [
                    {
                        'title': 'Drug Interactions',
                        'text': 'Contraindicated with MAO inhibitors. Serious interactions possible.'
                    }
                ]
            }
        }
        
        self.sample_nccih_data = {
            'result': {
                'safety': {
                    'interactions': [
                        'Moderate interaction potential with blood thinners.',
                        'Use with caution.'
                    ]
                },
                'evidence_level': 'B'
            }
        }
        
        self.sample_openfda_data = {
            'results': [
                {
                    'warnings': ['Severe interaction with certain medications.'],
                    'precautions': ['Contraindicated in patients taking...'],
                    'drug_interactions': ['Do not use with...']
                }
            ]
        }

    def test_medlineplus_parser(self):
        root = ET.fromstring(self.sample_medline_xml)
        result = MedlinePlusParser.parse_response(root)
        
        self.assertIsNotNone(result)
        self.assertEqual(result['source'], 'MedlinePlus')
        self.assertEqual(result['severity'], 'Major')
        self.assertEqual(result['evidence'], 'Strong')
        self.assertIn("Severe interaction", result['effect'])

    def test_dailymed_parser(self):
        result = DailyMedParser.parse_response(self.sample_dailymed_data)
        
        self.assertIsNotNone(result)
        self.assertEqual(result['source'], 'DailyMed')
        self.assertEqual(result['severity'], 'Major')
        self.assertIn("Contraindicated", result['effect'])

    def test_nccih_parser(self):
        result = NCCIHParser.parse_response(self.sample_nccih_data)
        
        self.assertIsNotNone(result)
        self.assertEqual(result['source'], 'NCCIH')
        self.assertEqual(result['severity'], 'Moderate')
        self.assertEqual(result['evidence'], 'Moderate')
        self.assertIn("blood thinners", result['effect'])

    def test_openfda_parser(self):
        result = OpenFDAParser.parse_response(self.sample_openfda_data)
        
        self.assertIsNotNone(result)
        self.assertEqual(result['source'], 'OpenFDA')
        self.assertEqual(result['severity'], 'Major')
        self.assertIn("Severe interaction", result['effect'])

    def test_combine_interaction_data(self):
        test_data = [
            {
                'source': 'MedlinePlus',
                'severity': 'Major',
                'effect': 'Serious interaction potential',
                'evidence': 'Strong'
            },
            {
                'source': 'DailyMed',
                'severity': 'Moderate',
                'effect': 'Use with caution',
                'evidence': 'Moderate'
            }
        ]
        
        result = combine_interaction_data(test_data)
        self.assertEqual(result['severity'], 'Major')
        self.assertIn('MedlinePlus', result['sources'])
        self.assertIn('DailyMed', result['sources'])
        self.assertEqual(result['evidence'], 'Strong')
        self.assertIn('Serious interaction potential', result['effect'])
        self.assertIn('Use with caution', result['effect'])

    def test_empty_interaction_data(self):
        result = combine_interaction_data([])
        self.assertEqual(result['severity'], 'Unknown')
        self.assertEqual(result['evidence'], 'Unknown')
        self.assertEqual(len(result['sources']), 0)

    def test_error_handling(self):
        # Test error handling in parsers
        self.assertIsNone(MedlinePlusParser.parse_response(None))
        self.assertIsNone(DailyMedParser.parse_response({}))
        self.assertIsNone(NCCIHParser.parse_response({}))
        self.assertIsNone(OpenFDAParser.parse_response({}))

if __name__ == '__main__':
    unittest.main()
