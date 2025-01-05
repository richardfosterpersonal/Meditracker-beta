#!/bin/bash

# Validation Chain Synchronization Script
# Updates and validates all critical path documents and their references

# Set timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S+01:00")
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_DIR="$PROJECT_ROOT/docs"
VALIDATION_DIR="$DOCS_DIR/validation"

# Update timestamps in all critical path documents
update_timestamps() {
    local file="$1"
    if [ -f "$file" ]; then
        sed -i "s/Last Updated: .*/Last Updated: $TIMESTAMP/" "$file"
        echo "Updated timestamp in $file"
    else
        echo "Warning: File not found - $file"
    fi
}

# Update all critical path documents
CRITICAL_PATHS=(
    "$VALIDATION_DIR/critical_path/MASTER_CRITICAL_PATH.md"
    "$VALIDATION_DIR/MASTER_VALIDATION_INDEX.md"
    "$VALIDATION_DIR/VALIDATION_CHAIN.md"
    "$DOCS_DIR/MASTER_CRITICAL_PATH.md"
    "$DOCS_DIR/BETA_CRITICAL_PATH.md"
    "$DOCS_DIR/VALIDATION_DOCUMENTATION.md"
    "$DOCS_DIR/MASTER_ALIGNMENT.md"
)

echo "Updating critical path documents..."
for path in "${CRITICAL_PATHS[@]}"; do
    update_timestamps "$path"
done

# Create validation chain index
echo "Creating validation chain index..."
cat > "$VALIDATION_DIR/VALIDATION_CHAIN.json" << EOL
{
    "last_updated": "$TIMESTAMP",
    "critical_paths": {
        "master": "docs/validation/critical_path/MASTER_CRITICAL_PATH.md",
        "beta": "docs/BETA_CRITICAL_PATH.md",
        "validation": "docs/VALIDATION_DOCUMENTATION.md",
        "alignment": "docs/MASTER_ALIGNMENT.md"
    },
    "validation_status": "active",
    "validation_required": false,
    "last_validation": "$TIMESTAMP"
}
EOL

# Create git hooks for validation
HOOKS_DIR="$PROJECT_ROOT/.git/hooks"
mkdir -p "$HOOKS_DIR"

# Create pre-commit hook
cat > "$HOOKS_DIR/pre-commit" << 'EOL'
#!/bin/bash
./scripts/sync_validation_chain.sh
python ./scripts/sync_validation_chain.py

# Check if validation passed
if [ $? -ne 0 ]; then
    echo "Error: Validation failed. Please fix validation issues before committing."
    exit 1
fi
EOL

chmod +x "$HOOKS_DIR/pre-commit"

echo "Validation chain synchronization complete!"
