# IDE Integration Guide
Last Updated: 2024-12-25T22:58:18+01:00

## VSCode Setup

### Recommended Extensions
1. **Python Extension Pack**
   - Python language support
   - Linting and formatting
   - Test discovery and debugging

2. **markdownlint**
   - Markdown validation
   - Documentation formatting

3. **GitLens**
   - Enhanced Git integration
   - Blame annotations
   - File history

### Workspace Settings
Add these settings to your workspace:

```json
{
    "python.linting.enabled": true,
    "python.linting.pylintEnabled": true,
    "python.testing.pytestEnabled": true,
    "files.associations": {
        "*validation.md": "markdown",
        "*proposal.md": "markdown"
    },
    "workbench.colorCustomizations": {
        "statusBar.background": "#ff0000",
        "statusBar.foreground": "#ffffff"
    }
}
```

### Tasks
Add these tasks to your workspace:

```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Validate Scope",
            "type": "shell",
            "command": "python",
            "args": [
                "backend/scripts/sonar-scope-check.py",
                "backend/app"
            ],
            "group": {
                "kind": "test",
                "isDefault": true
            }
        },
        {
            "label": "Create Feature Proposal",
            "type": "shell",
            "command": "cp",
            "args": [
                "docs/templates/IMPROVEMENT_PROPOSAL.md",
                "docs/proposals/${input:featureName}_proposal.md"
            ]
        },
        {
            "label": "Create Validation Document",
            "type": "shell",
            "command": "cp",
            "args": [
                "docs/templates/VALIDATION_DOCUMENT.md",
                "docs/validation/${input:featureName}_validation.md"
            ]
        }
    ],
    "inputs": [
        {
            "id": "featureName",
            "type": "promptString",
            "description": "Name of the feature"
        }
    ]
}
```

### Keyboard Shortcuts
Add these keyboard shortcuts:

```json
{
    "key": "ctrl+shift+v",
    "command": "workbench.action.tasks.runTask",
    "args": "Validate Scope"
},
{
    "key": "ctrl+shift+p",
    "command": "workbench.action.tasks.runTask",
    "args": "Create Feature Proposal"
},
{
    "key": "ctrl+shift+d",
    "command": "workbench.action.tasks.runTask",
    "args": "Create Validation Document"
}
```

## Integration Features

### 1. Scope Validation
- Automatic scope checking on save
- Visual indicators for validation status
- Quick fixes for common validation issues

### 2. Documentation Support
- Templates for validation documents
- Markdown preview for documentation
- Validation chain visualization

### 3. Git Integration
- Pre-commit hook integration
- Pull request template support
- Validation status in source control view

### 4. Critical Path Tracking
- Critical path visualization
- Impact analysis tools
- Validation requirement tracking

## Setup Instructions

1. Install recommended extensions
2. Copy workspace settings to `.vscode/settings.json`
3. Copy tasks to `.vscode/tasks.json`
4. Copy keyboard shortcuts to keybindings.json
5. Restart VSCode

## Troubleshooting

### Common Issues
1. **Scope Validation Fails**
   - Check validation documents exist
   - Verify critical path alignment
   - Review feature proposals

2. **Documentation Preview Issues**
   - Install markdownlint
   - Check file associations
   - Verify template paths

3. **Git Hook Integration**
   - Verify hook permissions
   - Check Python path
   - Review hook configurations
