"""
Document Validator Tests
Last Updated: 2024-12-25T11:43:14+01:00
Reference: DOCUMENT_HIERARCHY.md
Parent: MASTER_CRITICAL_PATH.md
"""

import pytest
from pathlib import Path
from app.core.document_validator import DocumentValidator, DocumentNode

class TestDocumentValidator:
    """Tests document hierarchy validation"""
    
    @pytest.fixture
    def validator(self, tmp_path):
        # Create test document structure
        master_doc = tmp_path / "docs" / "validation" / "MASTER_CRITICAL_PATH.md"
        master_doc.parent.mkdir(parents=True)
        master_doc.write_text("# Master Document")
        
        return DocumentValidator(tmp_path)
    
    def test_validate_hierarchy(self, validator, tmp_path):
        """Test document hierarchy validation"""
        # Create test documents
        level1_doc = tmp_path / "docs" / "validation" / "level1.md"
        level1_doc.write_text("""
        # Level 1 Document
        Reference: MASTER_CRITICAL_PATH.md
        """)
        
        level2_doc = tmp_path / "docs" / "validation" / "level2.md"
        level2_doc.write_text("""
        # Level 2 Document
        Reference: level1.md
        Reference: MASTER_CRITICAL_PATH.md
        """)
        
        # Validate
        validator.build_document_tree()
        errors = validator.validate_document("docs/validation/level2.md")
        assert not errors, "Valid hierarchy should have no errors"
    
    def test_detect_circular_reference(self, validator, tmp_path):
        """Test circular reference detection"""
        # Create circular reference
        doc1 = tmp_path / "docs" / "validation" / "doc1.md"
        doc1.write_text("""
        # Document 1
        Reference: doc2.md
        """)
        
        doc2 = tmp_path / "docs" / "validation" / "doc2.md"
        doc2.write_text("""
        # Document 2
        Reference: doc1.md
        """)
        
        # Validate
        errors = validator.validate_document("docs/validation/doc1.md")
        assert errors, "Circular reference should be detected"
        assert "Circular reference" in errors[0]
    
    def test_reference_update(self, validator, tmp_path):
        """Test reference updating"""
        # Create test document
        doc = tmp_path / "docs" / "validation" / "test_doc.md"
        content = """
        # Test Document
        Some content
        """
        
        # Update references
        updated_content = validator.update_references(
            "docs/validation/test_doc.md",
            content
        )
        
        assert "Reference: MASTER_CRITICAL_PATH.md" in updated_content, \
            "Master reference should be added"
    
    def test_invalid_reference_level(self, validator, tmp_path):
        """Test invalid reference level detection"""
        # Create test documents
        level1_doc = tmp_path / "docs" / "validation" / "level1.md"
        level1_doc.write_text("""
        # Level 1 Document
        Reference: MASTER_CRITICAL_PATH.md
        Reference: level2.md
        """)
        
        level2_doc = tmp_path / "docs" / "validation" / "level2.md"
        level2_doc.write_text("""
        # Level 2 Document
        Reference: MASTER_CRITICAL_PATH.md
        """)
        
        # Validate
        errors = validator.validate_document("docs/validation/level1.md")
        assert errors, "Invalid reference level should be detected"
        assert "Invalid reference" in errors[0]
