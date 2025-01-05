"""Test FastAPI import compatibility and patterns."""
import pytest
from importlib import import_module, util
import os
import ast


def get_python_files(start_path):
    """Get all Python files in the project."""
    python_files = []
    for root, _, files in os.walk(start_path):
        for file in files:
            if file.endswith('.py'):
                python_files.append(os.path.join(root, file))
    return python_files


def get_imports(file_path):
    """Extract imports from a Python file."""
    with open(file_path, 'r') as file:
        try:
            tree = ast.parse(file.read())
        except SyntaxError:
            return []
    
    imports = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for name in node.names:
                imports.append(name.name)
        elif isinstance(node, ast.ImportFrom):
            module = node.module if node.module else ''
            for name in node.names:
                imports.append(f"{module}.{name.name}")
    return imports


def test_fastapi_available():
    """Test FastAPI package is available."""
    assert util.find_spec("fastapi") is not None


def test_starlette_available():
    """Test Starlette package is available."""
    assert util.find_spec("starlette") is not None


def test_fastapi_version_compatibility():
    """Test FastAPI version compatibility."""
    fastapi = import_module("fastapi")
    starlette = import_module("starlette")
    
    assert hasattr(fastapi, "__version__"), "FastAPI version not found"
    assert hasattr(starlette, "__version__"), "Starlette version not found"
    
    fastapi_version = fastapi.__version__
    starlette_version = starlette.__version__
    
    assert fastapi_version == "0.109.2", f"FastAPI version mismatch: {fastapi_version}"
    assert starlette_version >= "0.36.3", f"Starlette version mismatch: {starlette_version}"


def test_import_patterns():
    """Test import patterns across codebase."""
    app_dir = os.path.join(os.path.dirname(__file__), "..", "app")
    python_files = get_python_files(app_dir)
    
    invalid_patterns = []
    valid_patterns = {
        "fastapi": {"FastAPI", "Request", "Response"},
        "starlette.responses": {"RedirectResponse"},
        "fastapi.responses": {"JSONResponse"},
    }
    
    for file_path in python_files:
        imports = get_imports(file_path)
        for imp in imports:
            if "fastapi" in imp or "starlette" in imp:
                module = imp.split('.')[0]
                name = imp.split('.')[-1]
                
                # Check if import follows valid patterns
                valid = False
                for valid_module, valid_names in valid_patterns.items():
                    if module in valid_module and name in valid_names:
                        valid = True
                        break
                
                if not valid:
                    invalid_patterns.append((file_path, imp))
    
    assert not invalid_patterns, f"Invalid import patterns found: {invalid_patterns}"
