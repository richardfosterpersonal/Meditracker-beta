"""
Validation Report Generator
Last Updated: 2024-12-25T23:07:46+01:00
Critical Path: Tools.Validation

Generates comprehensive validation reports with metrics and recommendations.
"""

import os
import sys
from pathlib import Path
from datetime import datetime
import logging
from typing import List, Dict, Set
from collections import defaultdict

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))
from app.core.validation_metrics import get_metrics_collector
from app.core.scope_validation import (
    ValidationContext,
    ValidationStatus,
    get_validation_context,
    is_critical_path_file
)

logger = logging.getLogger(__name__)

class ValidationReportGenerator:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.metrics_collector = get_metrics_collector()
        
    def analyze_codebase(self) -> Dict:
        """Analyze entire codebase for validation status"""
        stats = {
            'total_files': 0,
            'validated_files': 0,
            'critical_path_files': 0,
            'validation_coverage': 0.0,
            'validation_status': defaultdict(int),
            'critical_components': defaultdict(list)
        }
        
        for root, _, files in os.walk(self.project_root):
            for file in files:
                if not file.endswith('.py'):
                    continue
                    
                file_path = Path(root) / file
                context = get_validation_context(str(file_path))
                
                stats['total_files'] += 1
                
                if context.is_critical_path:
                    stats['critical_path_files'] += 1
                    component = file_path.parent.name
                    stats['critical_components'][component].append(str(file_path))
                    
                if self._is_file_validated(file_path):
                    stats['validated_files'] += 1
                    
        if stats['total_files'] > 0:
            stats['validation_coverage'] = (stats['validated_files'] / stats['total_files']) * 100
            
        return stats
    
    def _is_file_validated(self, file_path: Path) -> bool:
        """Check if a file has proper validation"""
        validation_file = self.project_root / 'docs' / 'validation' / f"{file_path.stem}_validation.md"
        return validation_file.exists()
    
    def generate_report(self) -> str:
        """Generate comprehensive validation report"""
        stats = self.analyze_codebase()
        trends = self.metrics_collector.get_validation_trends()
        
        report = [
            "# Validation Status Report",
            f"Generated: {datetime.now().isoformat()}",
            "",
            "## Codebase Statistics",
            f"- Total Python Files: {stats['total_files']}",
            f"- Validated Files: {stats['validated_files']}",
            f"- Critical Path Files: {stats['critical_path_files']}",
            f"- Validation Coverage: {stats['validation_coverage']:.1f}%",
            "",
            "## Critical Components"
        ]
        
        # Add critical components section
        for component, files in stats['critical_components'].items():
            report.extend([
                f"### {component}",
                *[f"- {Path(f).name}" for f in files],
                ""
            ])
            
        # Add recommendations based on stats
        report.extend([
            "## Recommendations",
            *self._generate_recommendations(stats)
        ])
        
        return "\n".join(report)
    
    def _generate_recommendations(self, stats: Dict) -> List[str]:
        """Generate recommendations based on stats"""
        recommendations = []
        
        if stats['validation_coverage'] < 80:
            recommendations.append(
                "- Priority: Increase validation coverage to at least 80%"
            )
            
        if stats['critical_path_files'] > 0:
            recommendations.append(
                "- Review critical path components for complete validation"
            )
            
        if not stats['validated_files']:
            recommendations.append(
                "- Create validation documents for core functionality"
            )
            
        return recommendations

def main():
    """Main entry point"""
    if len(sys.argv) != 2:
        print("Usage: python generate_validation_report.py <project_root>")
        sys.exit(1)
        
    project_root = sys.argv[1]
    if not os.path.isdir(project_root):
        print(f"Error: {project_root} is not a directory")
        sys.exit(1)
        
    generator = ValidationReportGenerator(project_root)
    report = generator.generate_report()
    
    # Save report with UTF-8 encoding
    output_dir = Path(project_root) / 'docs' / 'reports'
    output_dir.mkdir(parents=True, exist_ok=True)
    
    report_file = output_dir / f"validation_report_{datetime.now().strftime('%Y%m%d')}.md"
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report)
        
    print(f"\nReport generated: {report_file}")
    print("\nKey findings:")
    print("-------------")
    
    # Print summary
    for line in report.split('\n'):
        if line.startswith('- '):
            print(line)

if __name__ == '__main__':
    main()
